import { Hono } from 'hono';
import { get_db } from '../db';

export const referrals_routes = new Hono();

referrals_routes.get('/', async (c) => {
  const waitlist_id = c.req.param('wid');
  const entry_id = c.req.param('eid');
  const db = get_db();

  const entry = db.query('SELECT * FROM entries WHERE id = ? AND waitlist_id = ?').get(entry_id, waitlist_id) as any;
  if (!entry) return c.json({ error: 'Not Found' }, 404);

  const referred = db.query(
    'SELECT name, created_at FROM entries WHERE referred_by = ? ORDER BY created_at'
  ).all(entry_id) as any[];

  return c.json({
    count: referred.length,
    entries: referred.map(r => ({ name: r.name, created_at: r.created_at })),
  });
});
