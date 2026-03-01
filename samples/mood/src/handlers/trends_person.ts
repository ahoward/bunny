//
// trends_person.ts - GET /trends/person handler
//
// returns per-person 30-day rolling averages with daily breakdown.
// requires user_email param.
//

import type { Params, Emit, DailyBreakdown } from "../lib/types.ts"
import { success, error, required } from "../lib/result.ts"
import { read_moods } from "../lib/store.ts"

const PERIOD_DAYS = 30

function date_key(iso: string): string {
  return iso.slice(0, 10)
}

export async function handler(params: Params, _emit?: Emit) {
  // validate user_email
  const input = (params && typeof params === "object") ? params as Record<string, unknown> : null
  const user_email = typeof input?.user_email === "string" ? input.user_email.trim() : null

  if (typeof user_email !== "string" || user_email.length === 0) {
    return error({ user_email: [required("user_email")] })
  }

  const all = await read_moods()

  // filter to last 30 days and this user
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS)
  const cutoff_iso = cutoff.toISOString()

  const recent = all.filter(m => m.timestamp >= cutoff_iso && m.user_email === user_email)

  // group by date
  const by_date: Record<string, number[]> = {}
  for (const m of recent) {
    const key = date_key(m.timestamp)
    if (!by_date[key]) by_date[key] = []
    by_date[key].push(m.score)
  }

  // daily breakdown sorted oldest-first
  const daily: DailyBreakdown[] = Object.entries(by_date)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => ({
      date,
      average_score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
      entry_count:   scores.length
    }))

  // user average
  const all_scores = recent.map(m => m.score)
  const average_score = all_scores.length > 0
    ? Math.round((all_scores.reduce((a, b) => a + b, 0) / all_scores.length) * 100) / 100
    : null

  return success({
    user_email,
    average_score,
    daily,
    total_entries: recent.length,
    period_days:   PERIOD_DAYS
  })
}
