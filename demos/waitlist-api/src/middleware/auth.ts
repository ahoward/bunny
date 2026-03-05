import { MiddlewareHandler } from 'hono';

const API_KEY = process.env.API_KEY ?? 'test_key';

export function auth(): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const key = header.slice(7);
    if (key !== API_KEY) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
  };
}
