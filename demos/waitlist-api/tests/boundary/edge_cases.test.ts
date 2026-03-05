import { test, expect, describe } from 'bun:test';
import { create_test_app } from '../helpers';

describe('Boundary: Email Edge Cases', () => {
  test('EC-003: Very long email (>254 chars)', async () => {
    const { app } = create_test_app();
    const longEmail = 'a'.repeat(245) + '@example.com';
    const req = new Request('http://localhost/waitlists/123/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: longEmail })
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(422);
  });

  test('EC-020: Payload too large', async () => {
    const { app } = create_test_app();
    const hugePayload = 'a'.repeat(65000);
    const req = new Request('http://localhost/waitlists/123/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', name: hugePayload })
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(413);
  });
});
