//
// types.ts - core type definitions
//

export interface ErrorDetail {
  code:     string
  message:  string
  meta?:    unknown
}

export type ErrorMap = {
  [key: string]: ErrorDetail[] | ErrorMap
}

export interface Meta {
  path:        string
  timestamp:   string
  duration_ms: number
  [key: string]: unknown
}

export interface Result<T = unknown> {
  status:  "success" | "error"
  result:  T | null
  errors:  ErrorMap | null
  meta:    Meta
}

export type Params = unknown

export type Emit = (event: string, data?: unknown) => void

export type Handler = (params: Params, emit?: Emit) => Promise<Result>

//
// domain types
//

export interface MoodEntry {
  id:         string
  user_email: string
  score:      number
  note:       string | null
  timestamp:  string
}

export interface Trend {
  user_email:    string
  average_score: number
  entry_count:   number
  period_days:   number
}

export interface DailyBreakdown {
  date:          string   // YYYY-MM-DD
  average_score: number
  entry_count:   number
}
