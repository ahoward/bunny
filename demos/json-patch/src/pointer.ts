import type { JsonValue, Result } from "./types.ts";

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function decode_segment(s: string): string {
  return s.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function parse_pointer(pointer: string): Result<string[]> {
  if (pointer === "") return { ok: true, value: [] };
  if (!pointer.startsWith("/")) {
    return { ok: false, message: `invalid JSON Pointer: must start with "/" or be empty`, index: -1 };
  }
  const segments = pointer.slice(1).split("/").map(decode_segment);
  for (const seg of segments) {
    if (DANGEROUS_KEYS.has(seg)) {
      return { ok: false, message: `invalid JSON Pointer: "${seg}" is not allowed`, index: -1 };
    }
  }
  return { ok: true, value: segments };
}

function is_array_index(token: string): boolean {
  if (token === "0") return true;
  if (token === "-") return true;
  return /^[1-9]\d*$/.test(token);
}

export function resolve(doc: JsonValue, segments: string[]): Result<JsonValue> {
  let current: JsonValue = doc;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (Array.isArray(current)) {
      if (seg === "-") {
        return { ok: false, message: `cannot resolve "-" (past-end reference)`, index: -1 };
      }
      if (!is_array_index(seg)) {
        return { ok: false, message: `invalid array index: "${seg}"`, index: -1 };
      }
      const idx = parseInt(seg, 10);
      if (idx >= current.length) {
        return { ok: false, message: `array index ${idx} out of bounds (length ${current.length})`, index: -1 };
      }
      current = current[idx];
    } else if (typeof current === "object" && current !== null) {
      if (!(seg in current)) {
        return { ok: false, message: `path segment "${seg}" not found`, index: -1 };
      }
      current = (current as Record<string, JsonValue>)[seg];
    } else {
      return { ok: false, message: `cannot index into primitive value at segment "${seg}"`, index: -1 };
    }
  }
  return { ok: true, value: current };
}

export function resolve_parent(doc: JsonValue, segments: string[]): Result<{ parent: JsonValue; key: string }> {
  if (segments.length === 0) {
    return { ok: false, message: `cannot get parent of root`, index: -1 };
  }
  const parent_segments = segments.slice(0, -1);
  const key = segments[segments.length - 1];
  const result = resolve(doc, parent_segments);
  if (!result.ok) return result;
  return { ok: true, value: { parent: result.value, key } };
}
