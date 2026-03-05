import { ok, err, FIELD_DEFS, type CronResult, type ParsedCron } from "./types.js"
import { expand_field } from "./expand_field.js"

export function parse(expression: string): CronResult<ParsedCron> {
  if (!expression || typeof expression !== "string") {
    return err("empty or invalid expression")
  }

  const trimmed = expression.trim()
  if (trimmed === "") return err("empty expression")

  const tokens = trimmed.split(/\s+/)
  if (tokens.length !== 5) {
    return err(`expected 5 fields, got ${tokens.length}`)
  }

  const fields: number[][] = []
  for (let i = 0; i < 5; i++) {
    const result = expand_field(tokens[i], FIELD_DEFS[i].min, FIELD_DEFS[i].max)
    if (!result.ok) return err(`field ${i} (${FIELD_DEFS[i].name}): ${result.error}`)
    fields.push(result.value)
  }

  const dom_wild = tokens[2] === "*"
  const dow_wild = tokens[4] === "*"

  // normalize day-of-week: 7 -> 0, filter to 0-6, dedup, sort
  let days_of_week = fields[4].map(d => d === 7 ? 0 : d)
  days_of_week = [...new Set(days_of_week)].filter(d => d >= 0 && d <= 6).sort((a, b) => a - b)

  return ok({
    minutes: fields[0],
    hours: fields[1],
    days_of_month: fields[2],
    months: fields[3],
    days_of_week,
    dom_wild,
    dow_wild,
  })
}
