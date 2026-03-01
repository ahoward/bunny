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
