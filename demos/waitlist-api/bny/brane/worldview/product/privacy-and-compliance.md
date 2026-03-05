# Privacy and Compliance
Collecting emails and names puts the API squarely in PII territory — founders using it inherit compliance obligations.

## GDPR Implications
- The API is a **data processor**; the founder is the **data controller**
- Must support data deletion requests (right to erasure)
- Must support data export (right to portability)
- Consent must be captured at signup — the API should make this easy, not assume it
- IP address storage (for anti-gaming) is PII under GDPR

## CAN-SPAM / Email
If the API sends emails (confirmation, position updates, promotion notifications), it must include:
- Unsubscribe mechanism
- Physical mailing address (whose? the founder's or the API provider's?)
- Clear identification of sender

## Data Retention
- How long are entries kept after promotion or cancellation?
- Should there be automatic purge after N days?
- Founders may want to retain data for analytics — tension with minimization principle

## Trust Architecture
The API holds PII for potentially thousands of founders' users. A breach exposes all of them. This makes security posture a product differentiator, not just a technical concern.

## Minimum Viable Compliance
- `DELETE /entries/:id` endpoint (erasure)
- `GET /entries/:id` returns all stored data (portability)
- Documented data retention policy
- Email verification as opt-in confirmation
- Hashed IP storage
