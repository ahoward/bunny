//
// result.ts - result envelope helpers
//

import type { Result, ErrorMap, ErrorDetail, Meta } from "./types.ts"

export function success<T>(result: T, meta: Partial<Meta> = {}): Result<T> {
  return { status: "success", result, errors: null, meta: meta as Meta }
}

export function error(errors: ErrorMap, meta: Partial<Meta> = {}): Result {
  return { status: "error", result: null, errors, meta: meta as Meta }
}

export function required(field: string): ErrorDetail {
  return { code: "required", message: `${field} is required` }
}

export function invalid(field: string, reason: string): ErrorDetail {
  return { code: "invalid", message: `${field} ${reason}` }
}

export function invalid_json(message: string): ErrorDetail {
  return { code: "invalid_json", message }
}
