export function hash_ip(ip: string): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(ip);
  return hasher.digest('hex');
}
