//
// app.ts - the core app.call interface
//
// app is the single object where side effects live.
// pure functions take POD in and return POD out.
// anything that touches the outside world goes through app.
//

import type { Params, Result, Handler, Meta, Emit } from "./lib/types.ts"
import { error, invalid_json } from "./lib/result.ts"

//
// handler registry
//
const handlers: Map<string, Handler> = new Map()

//
// register a handler at a path
//
export function register(path: string, handler: Handler): void {
  handlers.set(path, handler)
}

//
// list all registered paths
//
export function paths(): string[] {
  return Array.from(handlers.keys()).sort()
}

//
// the main interface
//
export async function call(path: string, params: Params = null, emit?: Emit): Promise<Result> {
  const start = performance.now()

  const build_meta = (): Meta => ({
    path:        path,
    timestamp:   new Date().toISOString(),
    duration_ms: Math.round((performance.now() - start) * 1000) / 1000
  })

  const handler = handlers.get(path)

  if (!handler) {
    return {
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
  }

  try {
    const result = await handler(params, emit)
    result.meta = { ...result.meta, ...build_meta() }
    return result
  } catch (err) {
    return {
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
  }
}

//
// parse params from string (JSON)
//
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

//
// the app object
//
export const app = {
  call,
  register,
  paths,
  parse_params
}

export default app
