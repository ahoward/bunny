export async function dispatch_webhook(url: string, payload: object, secret: string): Promise<boolean> {
  const body = JSON.stringify(payload);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig_buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const sig = Array.from(new Uint8Array(sig_buf)).map(b => b.toString(16).padStart(2, '0')).join('');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': sig,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
