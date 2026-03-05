import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { create_test_app } from '../helpers';

describe('Contract: Waitlist Creation & Management', () => {
  test('US-001: Founder creates a waitlist successfully', async () => {
    const { app, api_key } = create_test_app();
    const req = new Request('http://localhost/waitlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api_key}` },
      body: JSON.stringify({ name: 'Acme Beta' })
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Acme Beta');
    expect(body.id).toBeDefined();
  });

  test('US-001: Founder omits name field', async () => {
    const { app, api_key } = create_test_app();
    const req = new Request('http://localhost/waitlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api_key}` },
      body: JSON.stringify({})
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(422);
  });

  test('US-001: Unauthorized access', async () => {
    const { app } = create_test_app();
    const req = new Request('http://localhost/waitlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Acme Beta' })
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(401);
  });
});
