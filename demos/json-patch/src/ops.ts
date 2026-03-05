import type { JsonValue, Result } from "./types.ts";
import { parse_pointer, resolve, resolve_parent } from "./pointer.ts";
import { deep_clone } from "./deep_clone.ts";
import { deep_equal } from "./deep_equal.ts";

function is_valid_array_index(token: string): boolean {
  if (token === "0") return true;
  if (token === "-") return true;
  return /^[1-9]\d*$/.test(token);
}

function err(message: string, index: number): Result<JsonValue> {
  return { ok: false, message, index };
}

export function op_add(doc: JsonValue, segments: string[], value: JsonValue, op_index: number): Result<JsonValue> {
  if (segments.length === 0) {
    return { ok: true, value };
  }

  const pr = resolve_parent(doc, segments);
  if (!pr.ok) return { ok: false, message: pr.message, index: op_index };
  const { parent, key } = pr.value;

  if (Array.isArray(parent)) {
    if (key === "-") {
      parent.push(value);
      return { ok: true, value: doc };
    }
    if (!is_valid_array_index(key)) {
      return err(`invalid array index: "${key}"`, op_index);
    }
    const idx = parseInt(key, 10);
    if (idx > parent.length) {
      return err(`array index ${idx} out of bounds (length ${parent.length})`, op_index);
    }
    parent.splice(idx, 0, value);
    return { ok: true, value: doc };
  }

  if (typeof parent === "object" && parent !== null) {
    (parent as Record<string, JsonValue>)[key] = value;
    return { ok: true, value: doc };
  }

  return err(`cannot add to primitive value`, op_index);
}

export function op_remove(doc: JsonValue, segments: string[], op_index: number): Result<JsonValue> {
  if (segments.length === 0) {
    return err(`cannot remove root document`, op_index);
  }

  const last = segments[segments.length - 1];
  if (last === "-") {
    return err(`"-" token is not valid for remove`, op_index);
  }

  const pr = resolve_parent(doc, segments);
  if (!pr.ok) return { ok: false, message: pr.message, index: op_index };
  const { parent, key } = pr.value;

  if (Array.isArray(parent)) {
    if (!is_valid_array_index(key)) {
      return err(`invalid array index: "${key}"`, op_index);
    }
    const idx = parseInt(key, 10);
    if (idx >= parent.length) {
      return err(`array index ${idx} out of bounds (length ${parent.length})`, op_index);
    }
    const removed = parent.splice(idx, 1)[0];
    return { ok: true, value: doc };
  }

  if (typeof parent === "object" && parent !== null) {
    const obj = parent as Record<string, JsonValue>;
    if (!(key in obj)) {
      return err(`target "${key}" does not exist`, op_index);
    }
    delete obj[key];
    return { ok: true, value: doc };
  }

  return err(`cannot remove from primitive value`, op_index);
}

export function op_replace(doc: JsonValue, segments: string[], value: JsonValue, op_index: number): Result<JsonValue> {
  if (segments.length === 0) {
    return { ok: true, value };
  }

  const last = segments[segments.length - 1];
  if (last === "-") {
    return err(`"-" token is not valid for replace`, op_index);
  }

  const pr = resolve_parent(doc, segments);
  if (!pr.ok) return { ok: false, message: pr.message, index: op_index };
  const { parent, key } = pr.value;

  if (Array.isArray(parent)) {
    if (!is_valid_array_index(key)) {
      return err(`invalid array index: "${key}"`, op_index);
    }
    const idx = parseInt(key, 10);
    if (idx >= parent.length) {
      return err(`array index ${idx} out of bounds (length ${parent.length})`, op_index);
    }
    parent[idx] = value;
    return { ok: true, value: doc };
  }

  if (typeof parent === "object" && parent !== null) {
    const obj = parent as Record<string, JsonValue>;
    if (!(key in obj)) {
      return err(`target "${key}" does not exist`, op_index);
    }
    obj[key] = value;
    return { ok: true, value: doc };
  }

  return err(`cannot replace in primitive value`, op_index);
}

export function op_move(doc: JsonValue, from_segments: string[], path_segments: string[], op_index: number): Result<JsonValue> {
  // Check prefix restriction: from cannot be a proper prefix of path
  if (from_segments.length < path_segments.length) {
    let is_prefix = true;
    for (let i = 0; i < from_segments.length; i++) {
      if (from_segments[i] !== path_segments[i]) {
        is_prefix = false;
        break;
      }
    }
    if (is_prefix) {
      return err(`move "from" cannot be a proper prefix of "path"`, op_index);
    }
  }

  // Same location: verify it exists, then no-op
  if (from_segments.length === path_segments.length && from_segments.every((s, i) => s === path_segments[i])) {
    const check = resolve(doc, from_segments);
    if (!check.ok) return { ok: false, message: check.message, index: op_index };
    return { ok: true, value: doc };
  }

  // Remove from source
  const source = resolve(doc, from_segments);
  if (!source.ok) return { ok: false, message: source.message, index: op_index };
  const moved_value = source.value;

  const remove_result = op_remove(doc, from_segments, op_index);
  if (!remove_result.ok) return remove_result;
  doc = remove_result.value;

  // Add to destination
  return op_add(doc, path_segments, moved_value, op_index);
}

export function op_copy(doc: JsonValue, from_segments: string[], path_segments: string[], op_index: number): Result<JsonValue> {
  const source = resolve(doc, from_segments);
  if (!source.ok) return { ok: false, message: source.message, index: op_index };
  const cloned = deep_clone(source.value);
  return op_add(doc, path_segments, cloned, op_index);
}

export function op_test(doc: JsonValue, segments: string[], value: JsonValue, op_index: number): Result<JsonValue> {
  const last = segments.length > 0 ? segments[segments.length - 1] : null;
  if (last === "-") {
    return err(`"-" token is not valid for test`, op_index);
  }

  const resolved = resolve(doc, segments);
  if (!resolved.ok) return { ok: false, message: resolved.message, index: op_index };

  if (!deep_equal(resolved.value, value)) {
    return err(`test failed: values are not equal`, op_index);
  }

  return { ok: true, value: doc };
}
