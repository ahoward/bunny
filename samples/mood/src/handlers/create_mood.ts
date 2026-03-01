//
// create_mood.ts - POST /moods handler
//

import type { Params, Emit } from "../lib/types.ts"
import { success, error, required, invalid } from "../lib/result.ts"
import { append_mood } from "../lib/store.ts"

export async function handler(params: Params, _emit?: Emit) {
  if (!params || typeof params !== "object") {
    return error({ params: [required("params")] })
  }

  const input = params as Record<string, unknown>
  const errors: Record<string, { code: string; message: string }[]> = {}

  const raw_email = typeof input.user_email === "string" ? input.user_email.trim() : input.user_email
  if (!raw_email || typeof raw_email !== "string") {
    errors.user_email = [required("user_email")]
  }

  if (input.score === undefined || input.score === null) {
    errors.score = [required("score")]
  } else if (
    typeof input.score !== "number" ||
    !Number.isInteger(input.score) ||
    input.score < 1 ||
    input.score > 5
  ) {
    errors.score = [invalid("score", "must be an integer 1-5")]
  }

  if (Object.keys(errors).length > 0) {
    return error(errors)
  }

  const raw_note = typeof input.note === "string" ? input.note.trim() : null

  const entry = {
    id:         crypto.randomUUID(),
    user_email: raw_email as string,
    score:      input.score as number,
    note:       raw_note || null,
    timestamp:  new Date().toISOString()
  }

  await append_mood(entry)

  return success({ created: entry })
}
