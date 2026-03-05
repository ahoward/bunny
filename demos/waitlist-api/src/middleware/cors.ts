import { MiddlewareHandler } from 'hono';

export function cors(): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    await next();
    c.res.headers.set('Access-Control-Allow-Origin', '*');
  };
}
