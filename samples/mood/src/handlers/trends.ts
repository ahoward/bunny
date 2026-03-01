//
// trends.ts - GET /trends handler
//
// returns per-user and team-wide mood averages over the last 30 days.
//

import type { Params, Emit, Trend } from "../lib/types.ts"
import { success } from "../lib/result.ts"
import { read_moods } from "../lib/store.ts"

const PERIOD_DAYS = 30

export async function handler(params: Params, _emit?: Emit) {
  const all = await read_moods()

  // filter to last 30 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS)
  const cutoff_iso = cutoff.toISOString()

  let recent = all.filter(m => m.timestamp >= cutoff_iso)

  // optional filter by user_email
  if (params && typeof params === "object") {
    const input = params as Record<string, unknown>
    if (typeof input.user_email === "string" && input.user_email.length > 0) {
      recent = recent.filter(m => m.user_email === input.user_email)
    }
  }

  // group by user
  const by_user: Record<string, number[]> = {}
  for (const m of recent) {
    if (!by_user[m.user_email]) by_user[m.user_email] = []
    by_user[m.user_email].push(m.score)
  }

  // per-user trends
  const per_user: Trend[] = Object.entries(by_user).map(([email, scores]) => ({
    user_email:    email,
    average_score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
    entry_count:   scores.length,
    period_days:   PERIOD_DAYS
  }))

  // team average
  const all_scores = recent.map(m => m.score)
  const team_average = all_scores.length > 0
    ? Math.round((all_scores.reduce((a, b) => a + b, 0) / all_scores.length) * 100) / 100
    : null

  return success({
    per_user,
    team_average,
    total_entries: recent.length,
    period_days:   PERIOD_DAYS
  })
}
