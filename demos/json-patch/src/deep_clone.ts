import type { JsonValue } from "./types.ts";

export function deep_clone(value: JsonValue): JsonValue {
  return structuredClone(value);
}
