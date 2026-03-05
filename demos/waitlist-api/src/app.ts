import { Hono } from 'hono';
import { auth } from './middleware/auth';
import { cors } from './middleware/cors';
import { create_rate_limiter } from './middleware/rate_limit';
import { waitlists_routes } from './routes/waitlists';
import { entries_routes } from './routes/entries';
import { position_routes } from './routes/position';
import { referrals_routes } from './routes/referrals';
import { promote_routes } from './routes/promote';

const MAX_BODY = 64_000;

export const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

// Body size guard for POST/PUT — read body clone to check actual size
app.use('*', async (c, next) => {
  if (c.req.method === 'POST' || c.req.method === 'PUT') {
    const cl = c.req.header('content-length');
    if (cl && parseInt(cl, 10) > MAX_BODY) {
      return c.json({ error: 'Payload Too Large' }, 413);
    }
    // Fallback: clone and check actual body size
    if (!cl) {
      const buf = await c.req.raw.clone().arrayBuffer();
      if (buf.byteLength > MAX_BODY) {
        return c.json({ error: 'Payload Too Large' }, 413);
      }
    }
  }
  await next();
});

// Admin routes
app.use('/waitlists', auth());
app.use('/waitlists/:id/settings', auth());
app.use('/waitlists/:id/promote', auth());
app.use('/waitlists/:id/entries/:eid', auth());
// GET entries by email is admin
app.use('/waitlists/:id/entries', async (c, next) => {
  if (c.req.method === 'GET') {
    const mw = auth();
    return mw(c, next);
  }
  await next();
});

// Public routes — CORS
app.use('/waitlists/:id/entries', cors());
app.use('/waitlists/:wid/entries/:eid/position', cors());
app.use('/waitlists/:wid/entries/:eid/referrals', cors());

// Rate limiting on public endpoints
const signup_limiter = create_rate_limiter(100, 60_000);
const position_limiter = create_rate_limiter(60, 60_000);

app.use('/waitlists/:id/entries', async (c, next) => {
  if (c.req.method === 'POST') return signup_limiter(c, next);
  await next();
});
app.use('/waitlists/:wid/entries/:eid/position', position_limiter);

// Mount routes
app.route('/waitlists', waitlists_routes);
app.route('/waitlists/:id/entries', entries_routes);
app.route('/waitlists/:wid/entries/:eid/position', position_routes);
app.route('/waitlists/:wid/entries/:eid/referrals', referrals_routes);
app.route('/waitlists/:id/promote', promote_routes);

// Global error handler
app.onError((err, c) => {
  if (err.message?.includes('JSON')) {
    return c.json({ error: 'Bad Request' }, 400);
  }
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});
