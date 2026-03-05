import { Hono } from 'hono';
import { get_db } from '../db';
import type { WaitlistSettings } from '../types';

export const waitlists_routes = new Hono();

function is_ssrf_url(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    if (hostname.startsWith('10.')) return true;
    if (hostname.startsWith('192.168.')) return true;
    if (hostname.startsWith('172.') && /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
    if (hostname.startsWith('169.254.')) return true;
    if (hostname === '0.0.0.0') return true;
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return true;
    return false;
  } catch {
    return true;
  }
}

waitlists_routes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return c.json({ error: 'name is required' }, 422);
  }
  const name = body.name.trim();
  if (name.length > 100) {
    return c.json({ error: 'name must be 100 characters or less' }, 422);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const webhook_secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const settings: WaitlistSettings = {
    webhook_url: null,
    webhook_secret,
    referral_reward: { type: 'position_bump', amount: 5 },
    queue_strategy: 'score',
  };

  const db = get_db();
  db.run(
    'INSERT INTO waitlists (id, name, owner_id, settings, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, '', JSON.stringify(settings), now]
  );

  return c.json({ id, name, settings, created_at: now }, 201);
});

waitlists_routes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = get_db();
  const row = db.query('SELECT * FROM waitlists WHERE id = ?').get(id) as any;
  if (!row) return c.json({ error: 'Not Found' }, 404);

  const stats_rows = db.query(
    'SELECT status, COUNT(*) as count FROM entries WHERE waitlist_id = ? GROUP BY status'
  ).all(id) as any[];

  const stats = { waiting: 0, promoted: 0, cancelled: 0 };
  for (const r of stats_rows) {
    if (r.status in stats) (stats as any)[r.status] = r.count;
  }

  return c.json({
    id: row.id,
    name: row.name,
    settings: JSON.parse(row.settings),
    created_at: row.created_at,
    stats,
  });
});

waitlists_routes.put('/:id/settings', async (c) => {
  const id = c.req.param('id');
  const db = get_db();

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Invalid body' }, 400);

  if (body.webhook_url && is_ssrf_url(body.webhook_url)) {
    return c.json({ error: 'webhook_url points to a private or reserved address' }, 422);
  }

  const row = db.query('SELECT * FROM waitlists WHERE id = ?').get(id) as any;
  if (!row) return c.json({ error: 'Not Found' }, 404);

  const existing = JSON.parse(row.settings);
  const merged = { ...existing, ...body };
  db.run('UPDATE waitlists SET settings = ? WHERE id = ?', [JSON.stringify(merged), id]);

  return c.json({ settings: merged });
});
