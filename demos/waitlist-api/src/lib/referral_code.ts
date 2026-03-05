const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generate_referral_code(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CHARS[bytes[i] % CHARS.length];
  }
  return code;
}
