import type { JsonValue } from "./types.ts";

export function deep_equal(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deep_equal(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object" && typeof b === "object") {
    if (Array.isArray(b)) return false;
    const a_obj = a as Record<string, JsonValue>;
    const b_obj = b as Record<string, JsonValue>;
    const a_keys = Object.keys(a_obj);
    const b_keys = Object.keys(b_obj);
    if (a_keys.length !== b_keys.length) return false;
    for (const key of a_keys) {
      if (!(key in b_obj)) return false;
      if (!deep_equal(a_obj[key], b_obj[key])) return false;
    }
    return true;
  }

  return false;
}
