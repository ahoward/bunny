//
// list_moods.ts - GET /moods handler
//

import type { Params, Emit } from "../lib/types.ts"
import { success } from "../lib/result.ts"
import { read_moods } from "../lib/store.ts"

export async function handler(params: Params, _emit?: Emit) {
  const all = await read_moods()

  // optional filter by user_email
  let filtered = all
  if (params && typeof params === "object") {
    const input = params as Record<string, unknown>
    if (typeof input.user_email === "string" && input.user_email.length > 0) {
      filtered = all.filter(m => m.user_email === input.user_email)
    }
  }

  // sort newest first
  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  return success({
    moods: filtered,
    count: filtered.length
  })
}
