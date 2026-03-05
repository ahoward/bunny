import { Hono } from 'hono';
import { get_db } from '../db';
import { enqueue_webhook } from '../lib/webhook_queue';

export const promote_routes = new Hono();

promote_routes.post('/', async (c) => {
  const waitlist_id = c.req.param('id');
  const db = get_db();

  const wl = db.query('SELECT * FROM waitlists WHERE id = ?').get(waitlist_id) as any;
  if (!wl) return c.json({ error: 'Not Found' }, 404);

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.count !== 'number' || body.count < 1 || !Number.isInteger(body.count)) {
    return c.json({ error: 'count must be a positive integer' }, 422);
  }
  if (body.count > 1000) {
    return c.json({ error: 'count must be 1000 or less' }, 422);
  }

  const now = new Date().toISOString();
  const settings = JSON.parse(wl.settings);

  const entries_to_promote = db.query(
    `SELECT id, email, name FROM entries WHERE waitlist_id = ? AND status = 'waiting' ORDER BY score DESC, created_at ASC LIMIT ?`
  ).all(waitlist_id, body.count) as any[];

  if (entries_to_promote.length === 0) {
    return c.json({ promoted: [], count: 0 });
  }

  const ids = entries_to_promote.map((e: any) => e.id);
  const placeholders = ids.map(() => '?').join(',');
  db.run(
    `UPDATE entries SET status = 'promoted', promoted_at = ? WHERE id IN (${placeholders})`,
    [now, ...ids]
  );

  for (const entry of entries_to_promote) {
    const event_id = crypto.randomUUID();
    const webhook_status = settings.webhook_url ? 'pending' : 'skipped';
    db.run(
      `INSERT INTO events (id, waitlist_id, entry_id, type, payload, webhook_status, attempts, created_at)
       VALUES (?, ?, ?, 'promotion', ?, ?, 0, ?)`,
      [event_id, waitlist_id, entry.id, JSON.stringify({ promoted_at: now }), webhook_status, now]
    );

    if (settings.webhook_url) {
      enqueue_webhook(event_id, settings.webhook_url, {
        event: 'promotion',
        entry: { id: entry.id, email: entry.email, name: entry.name, promoted_at: now },
        waitlist_id,
      }, settings.webhook_secret ?? '');
    }
  }

  return c.json({
    promoted: entries_to_promote.map((e: any) => ({ id: e.id, email: e.email, name: e.name, promoted_at: now })),
    count: entries_to_promote.length,
  });
});
