//
// ping.ts - health check handler
//

import type { Params, Emit } from "../lib/types.ts"
import { success } from "../lib/result.ts"

export async function handler(_params: Params, _emit?: Emit) {
  return success({
    pong:      true,
    timestamp: new Date().toISOString(),
    pid:       process.pid,
    uptime_ms: Math.round(performance.now())
  })
}
