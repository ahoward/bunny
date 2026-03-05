import { ok, err, type CronResult } from "./types.js"
import { parse } from "./parse.js"

const MAX_ITERATIONS_PER_RESULT = 10_000

export function next_times(
  expression: string,
  start: Date | string,
  n: number,
): CronResult<string[]> {
  if (n <= 0) return ok([])

  const parsed = parse(expression)
  if (!parsed.ok) return err(parsed.error)

  const { minutes, hours, days_of_month, months, days_of_week, dom_wild, dow_wild } = parsed.value

  const s = typeof start === "string" ? new Date(start) : new Date(start.getTime())

  // cursor starts at start time, truncated to minute, then advanced by 1 minute
  let year = s.getUTCFullYear()
  let month = s.getUTCMonth() + 1 // 1-based
  let day = s.getUTCDate()
  let hour = s.getUTCHours()
  let minute = s.getUTCMinutes() + 1 // advance past start

  // handle seconds/ms: if there were sub-minute components, we already advanced by +1 min
  // if start was exactly on a minute boundary, +1 min excludes it (EC-5)
  if (s.getUTCSeconds() > 0 || s.getUTCMilliseconds() > 0) {
    // already at the right minute since we did +1
  }

  // normalize overflow from minute+1
  normalize_cursor()

  const results: string[] = []
  const max_iter = n * MAX_ITERATIONS_PER_RESULT
  let iter = 0

  while (results.length < n && iter < max_iter) {
    iter++

    // advance to next valid month
    if (!months.includes(month)) {
      const next_month = find_next(months, month)
      if (next_month === null) {
        year++
        month = months[0]
      } else {
        month = next_month
      }
      day = 1
      hour = 0
      minute = 0
      continue
    }

    // compute valid days for this month
    const actual_days = days_in_month(year, month)
    const valid_days = compute_valid_days(
      days_of_month, days_of_week, dom_wild, dow_wild, year, month, actual_days,
    )

    if (valid_days.length === 0) {
      // no valid days this month, advance
      advance_month()
      continue
    }

    if (day > actual_days) {
      advance_month()
      continue
    }

    // advance to next valid day
    if (!valid_days.includes(day)) {
      const next_day = find_next(valid_days, day)
      if (next_day === null) {
        advance_month()
        continue
      }
      day = next_day
      hour = 0
      minute = 0
      continue
    }

    // advance to next valid hour
    if (!hours.includes(hour)) {
      const next_hour = find_next(hours, hour)
      if (next_hour === null) {
        advance_day(valid_days)
        continue
      }
      hour = next_hour
      minute = 0
      continue
    }

    // advance to next valid minute
    if (!minutes.includes(minute)) {
      const next_minute = find_next(minutes, minute)
      if (next_minute === null) {
        advance_hour(valid_days)
        continue
      }
      minute = next_minute
      continue
    }

    // all fields match — record result
    const d = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))
    results.push(d.toISOString())

    // advance by 1 minute for next iteration
    minute++
    normalize_cursor()
  }

  if (results.length < n) {
    return err(`iteration limit reached (${max_iter} iterations)`)
  }

  return ok(results)

  function advance_month() {
    const next_m = find_next(months, month + 1)
    if (next_m === null) {
      year++
      month = months[0]
    } else {
      month = next_m
    }
    day = 1
    hour = 0
    minute = 0
  }

  function advance_day(valid_days: number[]) {
    const next_d = find_next(valid_days, day + 1)
    if (next_d === null) {
      advance_month()
    } else {
      day = next_d
      hour = 0
      minute = 0
    }
  }

  function advance_hour(valid_days: number[]) {
    const next_h = find_next(hours, hour + 1)
    if (next_h === null) {
      advance_day(valid_days)
    } else {
      hour = next_h
      minute = 0
    }
  }

  function normalize_cursor() {
    if (minute >= 60) {
      hour += Math.floor(minute / 60)
      minute = minute % 60
    }
    if (hour >= 24) {
      day += Math.floor(hour / 24)
      hour = hour % 24
    }
    // day/month overflow handled in the main loop
  }
}

function find_next(sorted: number[], value: number): number | null {
  for (const v of sorted) {
    if (v >= value) return v
  }
  return null
}

function days_in_month(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function compute_valid_days(
  dom: number[],
  dow: number[],
  dom_wild: boolean,
  dow_wild: boolean,
  year: number,
  month: number,
  actual_days: number,
): number[] {
  const both_specified = !dom_wild && !dow_wild
  const dom_valid = dom.filter(d => d <= actual_days)

  if (both_specified) {
    // OR semantics: union of dom and dow matches
    const dow_days = get_dow_days(dow, year, month, actual_days)
    const union = new Set([...dom_valid, ...dow_days])
    return [...union].sort((a, b) => a - b)
  }

  if (dom_wild && dow_wild) {
    // both wildcard: every day
    const result: number[] = []
    for (let d = 1; d <= actual_days; d++) result.push(d)
    return result
  }

  if (dom_wild) {
    // only dow specified: filter by dow
    return get_dow_days(dow, year, month, actual_days)
  }

  // only dom specified (dow is wild)
  return dom_valid
}

function get_dow_days(dow: number[], year: number, month: number, actual_days: number): number[] {
  const result: number[] = []
  for (let d = 1; d <= actual_days; d++) {
    const weekday = new Date(Date.UTC(year, month - 1, d)).getUTCDay()
    if (dow.includes(weekday)) result.push(d)
  }
  return result
}
