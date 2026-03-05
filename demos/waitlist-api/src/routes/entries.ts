import { Hono } from 'hono';
import { get_db } from '../db';
import { normalize_email, validate_email } from '../lib/email';
import { generate_referral_code } from '../lib/referral_code';
import { base_score, compute_score } from '../lib/score';
import { hash_ip } from '../lib/ip_hash';
import { enqueue_webhook } from '../lib/webhook_queue';

export const entries_routes = new Hono();

entries_routes.post('/', async (c) => {
  const waitlist_id = c.req.param('id');
  const db = get_db();

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Invalid body' }, 400);

  if (!body.email || typeof body.email !== 'string' || body.email.trim().length === 0) {
    return c.json({ error: 'email is required' }, 422);
  }

  const email = normalize_email(body.email);
  const email_err = validate_email(email);
  if (email_err) return c.json({ error: email_err }, 422);

  const name = body.name ? String(body.name).slice(0, 200) : null;

  const wl = db.query('SELECT * FROM waitlists WHERE id = ?').get(waitlist_id) as any;
  if (!wl) return c.json({ error: 'Not Found' }, 404);

  const id = crypto.randomUUID();
  const referral_code = generate_referral_code();
  const now = new Date();
  const created_at = now.toISOString();
  const score = base_score(now);

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? '127.0.0.1';
  const ip_hashed = hash_ip(ip);

  let referred_by: string | null = null;
  if (body.referral_code && typeof body.referral_code === 'string') {
    const referrer = db.query(
      'SELECT id FROM entries WHERE referral_code = ? AND waitlist_id = ? AND status != ?'
    ).get(body.referral_code, waitlist_id, 'cancelled') as any;
    if (referrer && referrer.id !== id) {
      referred_by = referrer.id;
    }
  }

  try {
    db.run(
      `INSERT INTO entries (id, waitlist_id, email, name, referral_code, referred_by, score, status, email_verified, ip_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', 0, ?, ?)`,
      [id, waitlist_id, email, name, referral_code, referred_by, score, ip_hashed, created_at]
    );
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'email already registered' }, 409);
    }
    throw err;
  }

  if (referred_by) {
    const settings = JSON.parse(wl.settings);
    const bump = settings.referral_reward?.amount ?? 5;
    const EPOCH_SCALE = 1000;
    db.run('UPDATE entries SET score = score + ? WHERE id = ?', [bump * EPOCH_SCALE, referred_by]);

    const event_id = crypto.randomUUID();
    db.run(
      `INSERT INTO events (id, waitlist_id, entry_id, type, payload, webhook_status, attempts, created_at)
       VALUES (?, ?, ?, 'referral', ?, 'skipped', 0, ?)`,
      [event_id, waitlist_id, referred_by, JSON.stringify({ referee_id: id }), created_at]
    );
  }

  const event_id = crypto.randomUUID();
  db.run(
    `INSERT INTO events (id, waitlist_id, entry_id, type, payload, webhook_status, attempts, created_at)
     VALUES (?, ?, ?, 'signup', '{}', 'skipped', 0, ?)`,
    [event_id, waitlist_id, id, created_at]
  );

  const settings = JSON.parse(wl.settings);
  if (settings.webhook_url) {
    db.run('UPDATE events SET webhook_status = ? WHERE id = ?', ['pending', event_id]);
    enqueue_webhook(event_id, settings.webhook_url, {
      event: 'signup',
      entry: { id, email, name, referral_code, position: 0 },
      waitlist_id,
    }, settings.webhook_secret ?? '');
  }

  const pos = db.query(
    `SELECT COUNT(*) as cnt FROM entries WHERE waitlist_id = ? AND status = 'waiting' AND (score > ? OR (score = ? AND created_at < ?))`
  ).get(waitlist_id, score, score, created_at) as any;
  const total = db.query(
    `SELECT COUNT(*) as cnt FROM entries WHERE waitlist_id = ? AND status = 'waiting'`
  ).get(waitlist_id) as any;

  return c.json({
    entry_id: id,
    referral_code,
    position: (pos?.cnt ?? 0) + 1,
    total: total?.cnt ?? 0,
  }, 201);
});

entries_routes.delete('/:eid', async (c) => {
  const waitlist_id = c.req.param('id');
  const entry_id = c.req.param('eid');
  const purge = c.req.query('purge') === 'true';
  const db = get_db();

  const entry = db.query('SELECT * FROM entries WHERE id = ? AND waitlist_id = ?').get(entry_id, waitlist_id) as any;
  if (!entry) return c.json({ error: 'Not Found' }, 404);

  if (purge) {
    db.run("UPDATE entries SET status = 'cancelled', email = '', name = NULL, ip_hash = NULL WHERE id = ?", [entry_id]);
  } else {
    db.run("UPDATE entries SET status = 'cancelled' WHERE id = ?", [entry_id]);
  }

  const event_id = crypto.randomUUID();
  db.run(
    `INSERT INTO events (id, waitlist_id, entry_id, type, payload, webhook_status, attempts, created_at)
     VALUES (?, ?, ?, 'cancellation', '{}', 'skipped', 0, ?)`,
    [event_id, waitlist_id, entry_id, new Date().toISOString()]
  );

  return c.json({ ok: true });
});

entries_routes.get('/', async (c) => {
  const waitlist_id = c.req.param('id');
  const email_param = c.req.query('email');
  const db = get_db();

  if (!email_param) return c.json({ error: 'email query parameter is required' }, 400);

  const email = normalize_email(email_param);
  const entry = db.query('SELECT * FROM entries WHERE waitlist_id = ? AND email = ?').get(waitlist_id, email) as any;
  if (!entry) return c.json({ error: 'Not Found' }, 404);

  return c.json({
    id: entry.id,
    waitlist_id: entry.waitlist_id,
    email: entry.email,
    name: entry.name,
    referral_code: entry.referral_code,
    status: entry.status,
    score: entry.score,
    created_at: entry.created_at,
  });
});
