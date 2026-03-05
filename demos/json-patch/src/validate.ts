import type { Patch, Result } from "./types.ts";
import { parse_pointer } from "./pointer.ts";

const VALID_OPS = new Set(["add", "remove", "replace", "move", "copy", "test"]);
const OPS_WITH_VALUE = new Set(["add", "replace", "test"]);
const OPS_WITH_FROM = new Set(["move", "copy"]);

function is_valid_json_value(v: unknown): boolean {
  if (v === null) return true;
  const t = typeof v;
  if (t === "string" || t === "boolean") return true;
  if (t === "number") return Number.isFinite(v as number);
  if (Array.isArray(v)) return v.every(is_valid_json_value);
  if (t === "object") return Object.values(v as object).every(is_valid_json_value);
  return false;
}

export function validate(patch: unknown): Result<Patch> {
  if (!Array.isArray(patch)) {
    return { ok: false, message: "patch must be an array", index: -1 };
  }

  for (let i = 0; i < patch.length; i++) {
    const op = patch[i];
    if (typeof op !== "object" || op === null || Array.isArray(op)) {
      return { ok: false, message: `operation ${i}: must be an object`, index: i };
    }

    if (typeof op.op !== "string") {
      return { ok: false, message: `operation ${i}: missing "op" field`, index: i };
    }
    if (!VALID_OPS.has(op.op)) {
      return { ok: false, message: `operation ${i}: unknown operation "${op.op}"`, index: i };
    }

    if (typeof op.path !== "string") {
      return { ok: false, message: `operation ${i}: missing "path" field`, index: i };
    }
    const path_result = parse_pointer(op.path);
    if (!path_result.ok) {
      return { ok: false, message: `operation ${i}: ${path_result.message}`, index: i };
    }

    if (OPS_WITH_VALUE.has(op.op)) {
      if (!("value" in op) || op.value === undefined) {
        return { ok: false, message: `operation ${i}: missing "value" field`, index: i };
      }
      if (!is_valid_json_value(op.value)) {
        return { ok: false, message: `operation ${i}: invalid JSON value`, index: i };
      }
    }

    if (OPS_WITH_FROM.has(op.op)) {
      if (typeof op.from !== "string") {
        return { ok: false, message: `operation ${i}: missing "from" field`, index: i };
      }
      const from_result = parse_pointer(op.from);
      if (!from_result.ok) {
        return { ok: false, message: `operation ${i}: ${from_result.message}`, index: i };
      }
    }
  }

  return { ok: true, value: patch as Patch };
}
