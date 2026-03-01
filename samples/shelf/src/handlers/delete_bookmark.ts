//
// delete_bookmark.ts - remove a bookmark by id
//

import type { Params, Emit } from "../lib/types.ts"
import { success, error, required, invalid } from "../lib/result.ts"
import { delete_bookmark as remove_bookmark, find_bookmark } from "../lib/store.ts"

export async function handler(params: Params, _emit?: Emit) {
  if (!params || typeof params !== "object") {
    return error({ params: [required("params")] })
  }

  const input = params as Record<string, unknown>

  if (!input.id || typeof input.id !== "string" || input.id.trim().length === 0) {
    return error({ id: [required("id")] })
  }

  const id = input.id.trim()
  const existing = find_bookmark(id)

  if (!existing) {
    return error({ id: [invalid("id", "bookmark not found")] })
  }

  remove_bookmark(id)

  return success({ deleted: existing })
}
