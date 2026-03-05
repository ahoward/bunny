import { MiddlewareHandler } from 'hono';
import { hash_ip } from '../lib/ip_hash';

type Window = { count: number; reset_at: number };

export function create_rate_limiter(max_requests: number, window_ms: number): MiddlewareHandler {
  const windows = new Map<string, Window>();

  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? '127.0.0.1';
    const key = hash_ip(ip);
    const now = Date.now();

    let win = windows.get(key);
    if (!win || now >= win.reset_at) {
      win = { count: 0, reset_at: now + window_ms };
      windows.set(key, win);
    }

    win.count++;
    if (win.count > max_requests) {
      const retry_after = Math.ceil((win.reset_at - now) / 1000);
      c.res = new Response(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(retry_after) },
      });
      return;
    }

    await next();
  };
}
