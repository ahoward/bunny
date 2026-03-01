//
// trends_team.ts - GET /trends/team handler
//
// returns team-wide 30-day rolling averages with daily breakdown.
//

import type { Params, Emit, DailyBreakdown } from "../lib/types.ts"
import { success } from "../lib/result.ts"
import { read_moods } from "../lib/store.ts"

const PERIOD_DAYS = 30

function date_key(iso: string): string {
  return iso.slice(0, 10)
}

export async function handler(_params: Params, _emit?: Emit) {
  const all = await read_moods()

  // filter to last 30 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS)
  const cutoff_iso = cutoff.toISOString()

  const recent = all.filter(m => m.timestamp >= cutoff_iso)

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

  // overall team average
  const all_scores = recent.map(m => m.score)
  const team_average = all_scores.length > 0
    ? Math.round((all_scores.reduce((a, b) => a + b, 0) / all_scores.length) * 100) / 100
    : null

  return success({
    team_average,
    daily,
    total_entries: recent.length,
    period_days:   PERIOD_DAYS
  })
}
