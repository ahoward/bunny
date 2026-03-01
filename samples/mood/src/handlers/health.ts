//
// health.ts - canary endpoint
//
// exercises real infrastructure beyond /ping.
//

import type { Params, Emit, Result } from "../lib/types.ts"
import { success, error } from "../lib/result.ts"
import { call, paths } from "../app.ts"

interface HealthCheck {
  name:    string
  ok:      boolean
  message: string | null
}

export async function handler(_params: Params, _emit?: Emit): Promise<Result> {
  const checks: HealthCheck[] = []

  // check: handler registry is populated
  const registered = paths()
  checks.push({
    name:    "handler_registry",
    ok:      registered.length > 0,
    message: registered.length > 0 ? null : "no handlers registered"
  })

  // check: /ping responds successfully
  const ping_result = await call("/ping")
  checks.push({
    name:    "ping",
    ok:      ping_result.status === "success",
    message: ping_result.status === "success" ? null : "ping failed"
  })

  // check: Result envelope is well-formed
  const has_envelope = (
    "status" in ping_result &&
    "result" in ping_result &&
    "errors" in ping_result &&
    "meta" in ping_result
  )
  checks.push({
    name:    "result_envelope",
    ok:      has_envelope,
    message: has_envelope ? null : "Result envelope malformed"
  })

  const all_ok = checks.every(c => c.ok)

  if (!all_ok) {
    const failed = checks.filter(c => !c.ok)
    const error_map: Record<string, { code: string; message: string }[]> = {}
    for (const f of failed) {
      error_map[f.name] = [{ code: "health_check_failed", message: f.message ?? "check failed" }]
    }
    return error(error_map)
  }

  return success({
    ok:        true,
    checks:    checks,
    paths:     registered,
    timestamp: new Date().toISOString(),
    pid:       process.pid,
    uptime_ms: Math.round(performance.now())
  })
}
