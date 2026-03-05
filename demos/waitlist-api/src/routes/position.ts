import { Hono } from 'hono';
import { get_db } from '../db';

export const position_routes = new Hono();

position_routes.get('/', async (c) => {
  const waitlist_id = c.req.param('wid');
  const entry_id = c.req.param('eid');
  const db = get_db();

  const entry = db.query('SELECT * FROM entries WHERE id = ? AND waitlist_id = ?').get(entry_id, waitlist_id) as any;
  if (!entry || entry.status === 'cancelled') return c.json({ error: 'Not Found' }, 404);

  const total = db.query(
    `SELECT COUNT(*) as cnt FROM entries WHERE waitlist_id = ? AND status = 'waiting'`
  ).get(waitlist_id) as any;

  if (entry.status === 'promoted') {
    return c.json({ position: null, total: total?.cnt ?? 0, status: 'promoted' });
  }

  const pos = db.query(
    `SELECT COUNT(*) as cnt FROM entries WHERE waitlist_id = ? AND status = 'waiting' AND (score > ? OR (score = ? AND created_at < ?))`
  ).get(waitlist_id, entry.score, entry.score, entry.created_at) as any;

  return c.json({
    position: (pos?.cnt ?? 0) + 1,
    total: total?.cnt ?? 0,
    status: 'waiting',
  });
});
