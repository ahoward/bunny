//
// save_bookmark.ts - save a URL with tags and notes
//

import type { Params, Emit, ErrorDetail } from "../lib/types.ts"
import { success, error, required, invalid } from "../lib/result.ts"
import { save_bookmark as store_bookmark } from "../lib/store.ts"

export async function handler(params: Params, _emit?: Emit) {
  if (!params || typeof params !== "object") {
    return error({ params: [required("params")] })
  }

  const input = params as Record<string, unknown>
  const errors: Record<string, ErrorDetail[]> = {}

  // validate url (required)
  const raw_url = typeof input.url === "string" ? input.url.trim() : input.url
  if (!raw_url || typeof raw_url !== "string" || raw_url.length === 0) {
    errors.url = [required("url")]
  }

  // validate tags (optional, defaults to [])
  let tags: string[] = []
  if (input.tags !== undefined && input.tags !== null) {
    if (!Array.isArray(input.tags)) {
      errors.tags = [invalid("tags", "must be an array of strings")]
    } else {
      const all_strings = input.tags.every((t: unknown) => typeof t === "string")
      if (!all_strings) {
        errors.tags = [invalid("tags", "must be an array of strings")]
      } else {
        tags = (input.tags as string[]).map(t => t.trim()).filter(t => t.length > 0)
      }
    }
  }

  // validate title (optional)
  let title: string | null = null
  if (input.title !== undefined && input.title !== null) {
    if (typeof input.title !== "string") {
      errors.title = [invalid("title", "must be a string")]
    } else {
      const trimmed = input.title.trim()
      title = trimmed.length > 0 ? trimmed : null
    }
  }

  // validate notes (optional)
  let notes: string | null = null
  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== "string") {
      errors.notes = [invalid("notes", "must be a string")]
    } else {
      const trimmed = input.notes.trim()
      notes = trimmed.length > 0 ? trimmed : null
    }
  }

  if (Object.keys(errors).length > 0) {
    return error(errors)
  }

  const bookmark = {
    id:         crypto.randomUUID(),
    url:        raw_url as string,
    title,
    tags,
    notes,
    created_at: new Date().toISOString()
  }

  store_bookmark(bookmark)

  return success({ created: bookmark })
}
