import type { JsonValue, Result } from "./types.ts";
import { validate } from "./validate.ts";
import { parse_pointer } from "./pointer.ts";
import { deep_clone } from "./deep_clone.ts";
import { op_add, op_remove, op_replace, op_move, op_copy, op_test } from "./ops.ts";

export function apply(document: JsonValue, patch: unknown): Result<JsonValue> {
  const validated = validate(patch);
  if (!validated.ok) return validated;

  const ops = validated.value;
  let doc = deep_clone(document);

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const path_result = parse_pointer(op.path);
    if (!path_result.ok) return { ok: false, message: path_result.message, index: i };
    const path_segments = path_result.value;

    let result: Result<JsonValue>;

    switch (op.op) {
      case "add":
        result = op_add(doc, path_segments, op.value, i);
        break;
      case "remove":
        result = op_remove(doc, path_segments, i);
        break;
      case "replace":
        result = op_replace(doc, path_segments, op.value, i);
        break;
      case "move": {
        const from_result = parse_pointer(op.from);
        if (!from_result.ok) return { ok: false, message: from_result.message, index: i };
        result = op_move(doc, from_result.value, path_segments, i);
        break;
      }
      case "copy": {
        const from_result = parse_pointer(op.from);
        if (!from_result.ok) return { ok: false, message: from_result.message, index: i };
        result = op_copy(doc, from_result.value, path_segments, i);
        break;
      }
      case "test":
        result = op_test(doc, path_segments, op.value, i);
        break;
    }

    if (!result.ok) return result;
    doc = result.value;
  }

  return { ok: true, value: doc };
}
