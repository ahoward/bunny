export function parse_positive_int(s: string): number | null {
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (n <= 0) return null;
  if (!Number.isSafeInteger(n)) return null;
  return n;
}
