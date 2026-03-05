# Verification: 001-waitlist-api-product

### 1. Incomplete Verification in Entry Signup Contract
**Issue**: The contract test for US-002 (`contracts/entries.test.ts`) merely checks `expect(res.status).toBeDefined();` and skips validating the 201 status code, the response payload (`entry_id`, `referral_code`, `position`), and actual database persistence. It is essentially a no-op test.
**Severity**: critical
**Suggested Test**:
typescript
test('US-002: User signs up for a waitlist creates DB record and returns 201 with expected payload', async () => {
  const { app, db } = create_test_app();
  const res = await app.fetch(new Request('http://localhost/waitlists/123/entries', { 
    method: 'POST', 
    body: JSON.stringify({ email: 'alice@example.com', name: 'Alice' }) 
  }));
  expect(res.status).toBe(201);
  const body = await res.json();
  expect(body.entry_id).toBeDefined();
  expect(body.referral_code).toBeDefined();
  expect(body.position).toBeGreaterThan(0);
  
  const dbEntry = await db.query('SELECT * FROM entries WHERE email = ?', ['alice@example.com']);
  expect(dbEntry).toBeDefined();
});


### 2. Missing Cryptographic Signature for Webhooks (Challenge #2)
**Issue**: The test suite completely lacks verification that outgoing webhooks contain a cryptographic signature (e.g., HMAC-SHA256). Without this, founders cannot securely verify the origin of promotion events, leading to severe unauthorized access vulnerabilities in downstream systems.
**Severity**: critical
**Suggested Test**:
typescript
test('Webhook dispatch includes valid HMAC-SHA256 signature header based on payload and secret', async () => {
  const { webhook_mock, trigger_promotion } = setup_webhook_env('my_secret_key');
  await trigger_promotion(1);
  
  const request = await webhook_mock.wait_for_request();
  const signature = request.headers.get('x-waitlist-signature');
  const expected_signature = crypto.createHmac('sha256', 'my_secret_key').update(request.body).digest('hex');
  
  expect(signature).toBe(expected_signature);
});


### 3. Missing GDPR Right to Erasure Validation (Challenge #3)
**Issue**: There are no tests to enforce that `DELETE /waitlists/:id/entries/:eid` actually anonymizes or scrubs PII (`email`, `name`, `ip_hash`). Merely checking for a 200 OK or a `cancelled` status allows silent violation of global privacy laws.
**Severity**: critical
**Suggested Test**:
typescript
test('Deleting an entry physically scrubs PII fields to comply with GDPR/CCPA', async () => {
  const { app, db, entry_id } = await seed_active_entry('bob@example.com', 'Bob');
  
  await app.fetch(new Request(`http://localhost/waitlists/123/entries/${entry_id}`, { method: 'DELETE' }));
  
  const dbEntry = await db.query('SELECT email, name, ip_hash, status FROM entries WHERE id = ?', [entry_id]);
  expect(dbEntry.status).toBe('cancelled');
  expect(dbEntry.email).toBeNull(); // or masked/hashed
  expect(dbEntry.name).toBeNull();
  expect(dbEntry.ip_hash).toBeNull();
});


### 4. Unbounded Memory Allocation on Promotion API (Challenge #5)
**Issue**: The boundary tests check for large payloads (EC-020) and long emails (EC-003) but do not test the promotion endpoint's `count` parameter limit. An attacker or careless user passing an excessively large `count` could trigger an Out-of-Memory (OOM) crash.
**Severity**: high
**Suggested Test**:
typescript
test('Promotion API rejects excessively large count parameters to prevent OOM', async () => {
  const { app, api_key } = create_test_app();
  const res = await app.fetch(new Request('http://localhost/waitlists/123/promote', { 
    method: 'POST', 
    headers: { 'Authorization': `Bearer ${api_key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 1000000 }) 
  }));
  expect(res.status).toBe(422); // Validation error
});


### 5. Missing Tie-Breaker in Position Calculation (Challenge #6)
**Issue**: `property/score.test.ts` only validates that scores mathematically increase. It fails to test the queue position calculation when multiple users share the exact same score (e.g., signing up in the same second with 0 referrals), which can lead to skipped rank numbers and duplicate positions.
**Severity**: high
**Suggested Test**:
typescript
test('Position calculation applies deterministic tie-breaker (e.g., serial ID) for identical scores', async () => {
  const { db, get_position } = setup_position_env();
  
  // Force identical scores
  await db.insert_entry({ id: 1, created_at: '2026-03-05T12:00:00Z', score: 100 });
  await db.insert_entry({ id: 2, created_at: '2026-03-05T12:00:00Z', score: 100 });
  
  const pos1 = await get_position(1);
  const pos2 = await get_position(2);
  
  expect(pos1.position).not.toBe(pos2.position);
  expect([pos1.position, pos2.position].sort()).toEqual([1, 2]); // No skipped ranks
});


### 6. Ignored Data Inconsistency During Concurrent Referrals (Challenge #10)
**Issue**: There are no tests asserting database transaction safety under concurrent load for referral score updates. A naive implementation without explicit row-level locking or atomic increments will silently lose referral points.
**Severity**: medium
**Suggested Test**:
typescript
test('Concurrent signups with the same referral code atomicly update referrer score without lost updates', async () => {
  const { app, db, referrer_code } = await seed_referrer();
  
  // Fire 50 signups simultaneously
  await Promise.all(Array.from({ length: 50 }).map((_, i) => 
    app.fetch(new Request('http://localhost/waitlists/123/entries', { 
      method: 'POST', 
      body: JSON.stringify({ email: `test${i}@example.com`, referral_code: referrer_code }) 
    }))
  ));
  
  const referrer = await db.query('SELECT score FROM entries WHERE referral_code = ?', [referrer_code]);
  expect(referrer.score).toBe(base_score + (50 * reward_amount));
});


### 7. Fake Golden Test Execution
**Issue**: `golden/position.test.ts` does not actually fetch from the API. It hardcodes a `mock_response` object and compares it to the fixture, providing zero assurance that the actual application code correctly shapes the JSON.
**Severity**: medium
**Suggested Test**:
typescript
test('Position endpoint response matches golden fixture structure exactly', async () => {
  const { app } = await seed_golden_state();
  const res = await app.fetch(new Request('http://localhost/waitlists/123/entries/456/position'));
  const body = await res.json();
  
  expect(body).toMatchObject(expected_fixture);
});
