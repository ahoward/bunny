export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

export function parse_positive_int(raw: string): ParseResult {
  if (raw === "" || raw === null || raw === undefined) {
    return { ok: false, message: "Expected positive integer, got empty value" };
  }

  const n = Number(raw);

  if (!Number.isFinite(n)) {
    return { ok: false, message: `Expected positive integer, got '${raw}'` };
  }

  if (!Number.isInteger(n)) {
    return { ok: false, message: `Expected positive integer, got '${raw}'` };
  }

  if (n < 1) {
    return { ok: false, message: `Expected positive integer, got '${raw}'` };
  }

  if (n > Number.MAX_SAFE_INTEGER) {
    return { ok: false, message: `Number too large: '${raw}'` };
  }

  return { ok: true, value: n };
}

const MAX_RANGE = 1000;

export function validate_range(from_raw: string | null, to_raw: string | null):
  | { ok: true; from: number; to: number }
  | { ok: false; message: string } {

  if (from_raw === null || to_raw === null) {
    return { ok: false, message: "Both 'from' and 'to' query parameters are required" };
  }

  const from_result = parse_positive_int(from_raw);
  if (!from_result.ok) return { ok: false, message: `Invalid 'from': ${from_result.message}` };

  const to_result = parse_positive_int(to_raw);
  if (!to_result.ok) return { ok: false, message: `Invalid 'to': ${to_result.message}` };

  if (from_result.value > to_result.value) {
    return { ok: false, message: "from must be <= to" };
  }

  if (to_result.value - from_result.value + 1 > MAX_RANGE) {
    return { ok: false, message: `Range too large (max ${MAX_RANGE})` };
  }

  return { ok: true, from: from_result.value, to: to_result.value };
}
