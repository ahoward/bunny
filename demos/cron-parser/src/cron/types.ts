export type CronResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export function ok<T>(value: T): CronResult<T> {
  return { ok: true, value }
}

export function err<T>(error: string): CronResult<T> {
  return { ok: false, error }
}

export type ParsedCron = {
  minutes: number[]
  hours: number[]
  days_of_month: number[]
  months: number[]
  days_of_week: number[]
  dom_wild: boolean
  dow_wild: boolean
}

export const FIELD_DEFS = [
  { name: "minute",       min: 0,  max: 59 },
  { name: "hour",         min: 0,  max: 23 },
  { name: "day_of_month", min: 1,  max: 31 },
  { name: "month",        min: 1,  max: 12 },
  { name: "day_of_week",  min: 0,  max: 7  },
] as const
