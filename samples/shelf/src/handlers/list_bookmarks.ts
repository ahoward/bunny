//
// list_bookmarks.ts - list bookmarks with optional filtering
//
// supports optional params:
//   tag - exact tag match (case-sensitive)
//   q   - full-text search across url, title, notes, tags (case-insensitive)
//

import type { Params, Emit } from "../lib/types.ts"
import type { ErrorMap } from "../lib/types.ts"
import { success, error, invalid } from "../lib/result.ts"
import { read_bookmarks, search_bookmarks } from "../lib/store.ts"

export async function handler(params: Params, _emit?: Emit) {
  const p = (params && typeof params === "object") ? params as Record<string, unknown> : {}

  const errors: ErrorMap = {}
  if (p.tag !== undefined && typeof p.tag !== "string") errors.tag = [invalid("tag", "must be a string")]
  if (p.q !== undefined && typeof p.q !== "string") errors.q = [invalid("q", "must be a string")]
  if (Object.keys(errors).length > 0) return error(errors)

  const tag = typeof p.tag === "string" ? p.tag.trim() || null : null
  const q = typeof p.q === "string" ? p.q.trim() || null : null

  const has_filters = tag !== null || q !== null
  const bookmarks = has_filters ? search_bookmarks({ tag, q }) : read_bookmarks()
  return success({ bookmarks, count: bookmarks.length })
}
