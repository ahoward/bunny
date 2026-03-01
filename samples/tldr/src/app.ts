//
// app.ts - the core app.call interface
//

import type { Params, Result, Handler, Meta, Emit } from "./lib/types.ts"
import { error, invalid_json } from "./lib/result.ts"
import { log_call } from "./lib/log.ts"

const handlers: Map<string, Handler> = new Map()

export function register(path: string, handler: Handler): void {
  handlers.set(path, handler)
}

export function paths(): string[] {
  return Array.from(handlers.keys()).sort()
}

export async function call(path: string, params: Params = null, emit?: Emit): Promise<Result> {
  const start = performance.now()

  const build_meta = (): Meta => ({
    path:        path,
    timestamp:   new Date().toISOString(),
    duration_ms: Math.round((performance.now() - start) * 1000) / 1000
  })

  const handler = handlers.get(path)

  if (!handler) {
    const not_found: Result = {
      status:  "error",
      result:  null,
      errors:  {
        path: [{
          code:    "not_found",
          message: `handler not found: ${path}`
        }]
      },
      meta: build_meta()
    }
    log_call({ path, status: not_found.status, duration_ms: not_found.meta.duration_ms, timestamp: not_found.meta.timestamp })
    return not_found
  }

  try {
    const result = await handler(params, emit)
    result.meta = { ...result.meta, ...build_meta() }
    log_call({ path, status: result.status, duration_ms: result.meta.duration_ms, timestamp: result.meta.timestamp })
    return result
  } catch (err) {
    const caught: Result = {
      status:  "error",
      result:  null,
      errors:  {
        handler: [{
          code:    "exception",
          message: err instanceof Error ? err.message : String(err)
        }]
      },
      meta: build_meta()
    }
    log_call({ path, status: caught.status, duration_ms: caught.meta.duration_ms, timestamp: caught.meta.timestamp })
    return caught
  }
}

export function parse_params(input: string): Result<Params> {
  const trimmed = input.trim()

  if (trimmed === "") {
    return {
      status:  "success",
      result:  null,
      errors:  null,
      meta:    {} as Meta
    }
  }

  try {
    const parsed = JSON.parse(trimmed)
    return {
      status:  "success",
      result:  parsed,
      errors:  null,
      meta:    {} as Meta
    }
  } catch (err) {
    return error(
      { params: [invalid_json(err instanceof Error ? err.message : "invalid JSON")] }
    )
  }
}

export const app = {
  call,
  register,
  paths,
  parse_params
}

export default app
