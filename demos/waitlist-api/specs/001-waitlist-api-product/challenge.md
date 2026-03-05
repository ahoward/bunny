# Challenge: 001-waitlist-api-product

### 1. SSRF (Server-Side Request Forgery) in Webhook URLs
- **Gap**: The API allows founders to configure a `webhook_url` to receive POST requests for promotions and signups. There are no specified restrictions on this URL, allowing attackers to input internal IP addresses (e.g., `localhost`, `10.0.0.0/8`) or cloud metadata endpoints (e.g., AWS `169.254.169.254`) to perform internal network scanning or extract sensitive infrastructure credentials.
- **Severity**: critical
- **Scenario**:
  - **Given**: An attacker creates an account and a waitlist via the API.
  - **When**: The attacker sets the `webhook_url` to `http://169.254.169.254/latest/meta-data/iam/security-credentials/` and triggers a promotion event.
  - **Then**: The Waitlist API server executes an HTTP POST to its own cloud environment's metadata service, potentially leaking AWS credentials in error logs, response times, or via blind SSRF callbacks.

### 2. Lack of Webhook Signature Verification
- **Gap**: Webhooks are dispatched to external founder systems to automate granting product access. However, there is no mention of cryptographic signatures (e.g., HMAC-SHA256) included in the webhook headers. Without a signature, founders cannot verify that the incoming HTTP request actually originated from the Waitlist API.
- **Severity**: critical
- **Scenario**:
  - **Given**: A founder configures a webhook (`https://api.acme.com/grant-access`) to automatically provision accounts when a user is promoted.
  - **When**: An attacker discovers or guesses the webhook URL and sends a spoofed HTTP POST request matching the promotion payload format.
  - **Then**: The founder's system processes the forged request and grants the attacker product access, completely bypassing the waitlist.

### 3. GDPR/CCPA Right to Erasure Violation
- **Gap**: US-009 dictates that deleting an entry merely changes its status to `cancelled`. PII (email, name, `ip_hash`) is retained indefinitely in the database. There is no mechanism defined for the hard deletion or anonymization of user data, violating global privacy regulations.
- **Severity**: critical
- **Scenario**:
  - **Given**: A waitlist user residing in the EU explicitly requests that their data be completely deleted.
  - **When**: The founder honors the request by executing `DELETE /waitlists/:id/entries/:eid`.
  - **Then**: The user's status updates to `cancelled`, but their raw email and name are preserved in the Waitlist API's database, placing the system in violation of GDPR.

### 4. Denial of Service via Email Squatting
- **Gap**: The system enforces strict email uniqueness per waitlist but does not require email verification to hold the slot. A malicious actor can easily block legitimate users by pre-registering their email addresses. 
- **Severity**: high
- **Scenario**:
  - **Given**: A highly anticipated waitlist is launched to the public.
  - **When**: A malicious actor writes a script to bulk-submit the emails of known industry figures and potential customers (e.g., `ceo@target.com`).
  - **Then**: When the actual users attempt to sign up, they receive a `409 Conflict` ("email already registered") and are entirely locked out of controlling their waitlist position.

### 5. Unbounded Memory Allocation on Promotion API
- **Gap**: US-006 promotes the top N users and returns the promoted entries in the HTTP response. There is no maximum limit enforced on the `count` parameter.
- **Severity**: high
- **Scenario**:
  - **Given**: A waitlist has accumulated 500,000 waiting entries.
  - **When**: The founder sends `POST /waitlists/:id/promote` with `{ count: 500000 }`.
  - **Then**: The server attempts to query, update, and serialize 500,000 database records into a single JSON response, resulting in an Out of Memory (OOM) crash or a gateway timeout.

### 6. Missing Tie-Breaker in Position Calculation
- **Gap**: The position rank is determined by `COUNT(*) + 1 ... score > this_entry.score`. If multiple entries share the exact same score, they will be assigned the exact same queue position, resulting in skipped ranks.
- **Severity**: high
- **Scenario**:
  - **Given**: A waitlist has 0 entries.
  - **When**: User A and User B sign up in the exact same second (sharing the same `created_at_unix` and therefore the same base score) and neither has referrals.
  - **Then**: Both users query their position and receive `{ position: 1 }`. When User C signs up, they receive `{ position: 3 }`, meaning rank 2 simply does not exist.

### 7. Database Performance Bottleneck on Position Queries
- **Gap**: Calculating position on-the-fly via a `COUNT(*)` query for every `GET /position` request will not scale. Even with an index on `(waitlist_id, status, score)`, counting tens of thousands of rows per request will severely degrade database CPU under high concurrency.
- **Severity**: high
- **Scenario**:
  - **Given**: A waitlist reaches 200,000 entries.
  - **When**: A marketing email goes out and 2,000 users concurrently call `GET /position` to check their status.
  - **Then**: The database executes 2,000 concurrent index scans over large row ranges, saturating the CPU, timing out requests, and failing NFR-001 (<100ms latency).

### 8. Score Calculation Mathematical Imbalance
- **Gap**: The default score blends a Unix timestamp with an arbitrary referral bonus integer (`score = base_score + referral_bonus`). Because Unix timestamps increment by 1 per second, 1 point of referral bonus equals exactly 1 second of queue advantage. This makes the `referral_reward.amount` incredibly difficult for founders to tune practically.
- **Severity**: medium
- **Scenario**:
  - **Given**: A waitlist with `referral_reward.amount = 10`. User A signs up on Monday.
  - **When**: User B signs up on Tuesday (86,400 seconds later) and successfully refers 5,000 people (earning a 50,000 point bonus).
  - **Then**: Despite referring 5,000 users, User B's score increase (50,000) is less than the 86,400-second penalty for being a day late. User B remains far behind User A, rendering the referral program useless.

### 9. Referral Farming via Email Aliases
- **Gap**: EC-002 explicitly accepts `+` aliases as distinct emails. Because email verification is optional, a single user can infinitely farm referral points by scripting signups against their own aliases.
- **Severity**: medium
- **Scenario**:
  - **Given**: A user signs up as `alice@gmail.com` and receives referral code `ALICE1`.
  - **When**: The user scripts 5,000 automated signups using `alice+1@gmail.com`, `alice+2@gmail.com`, etc., all passing `referral_code: "ALICE1"`.
  - **Then**: `alice@gmail.com` receives 5,000 referral bonuses, unfairly rocketing to the #1 position on the waitlist without bringing actual unique humans to the product.

### 10. Data Inconsistency During Concurrent Referrals
- **Gap**: EC-010 claims referrer score updates are "serialized to prevent race conditions," but doesn't specify how. If the application layer uses a standard ORM read-modify-write pattern without explicit row-level database locking (`SELECT for UPDATE`) or atomic SQL increments, score increments will be lost under heavy load.
- **Severity**: medium
- **Scenario**:
  - **Given**: A high-profile influencer tweets their referral code `INFL1`.
  - **When**: 50 followers sign up using `INFL1` within the exact same 10-millisecond window.
  - **Then**: Multiple application threads read the influencer's current score simultaneously, add the bonus, and save. The final score reflects only a fraction of the 50 referrals due to lost update anomalies.
