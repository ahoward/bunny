export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };
