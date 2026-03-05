import { test, expect, describe } from 'bun:test';
import { create_test_app } from '../helpers';

describe('Boundary: Security & SSRF (Challenge #1)', () => {
  test('Rejects internal IPs for webhook_url', async () => {
    const { app, api_key } = create_test_app();
    const req = new Request('http://localhost/waitlists/123/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api_key}` },
      body: JSON.stringify({ webhook_url: 'http://169.254.169.254/latest/meta-data/' })
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(422);
  });
});
