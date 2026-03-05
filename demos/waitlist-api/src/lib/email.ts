export function normalize_email(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validate_email(email: string): string | null {
  if (!email || email.length === 0) return 'email is required';
  if (email.length > 254) return 'email is invalid';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'email is invalid';
  return null;
}
