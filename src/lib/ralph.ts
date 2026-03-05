//
// ralph.ts - retry loop engine
//
// "deterministically bad in an undeterministic world"
//
// runs a command repeatedly until:
//   - exit code 0 (success)
//   - max iterations reached
//   - max budget exceeded
//
// each iteration is logged as a JSON line to stderr.
// pure in-memory state. no database.
//

import * as assassin from "./assassin.ts"
import { scrub_agent_env } from "./spawn.ts"

export interface RalphOptions {
  command?:     string[]                    // subprocess mode
  fn?:          () => Promise<number>       // in-process mode (compiled binary)
  max_iter:     number       // 0 = unlimited
  max_budget:   number       // reserved for future use (currently unused)
  timeout_ms:   number       // 0 = unlimited (per iteration)
  session_id:   string | null // for logging continuity
}

export interface RalphResult {
  status:       "complete" | "max_iter" | "max_budget" | "failed"
  iterations:   number
  budget_usd:   number
  last_exit:    number | null
  session_id:   string
}

const BNY_LOG_ENABLED = process.env.BUNNY_LOG === "1"

function log_iteration(entry: {
  session_id:  string
  iteration:   number
  exit_code:   number | null
  duration_ms: number
  status:      string
}): void {
  if (!BNY_LOG_ENABLED) return
  process.stderr.write(JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
    type:      "ralph_iteration",
  }) + "\n")
}

const BACKOFF_BASE_MS = 2000  // 2s initial delay
const BACKOFF_MAX_MS  = 30000 // 30s max delay

export async function ralph(opts: RalphOptions): Promise<RalphResult> {
  const session_id = opts.session_id ?? crypto.randomUUID()

  let iteration = 0
  let budget_usd = 0.0
  let last_exit: number | null = null

  while (true) {
    iteration++

    // check max iterations
    if (opts.max_iter > 0 && iteration > opts.max_iter) {
      return { status: "max_iter", iterations: iteration - 1, budget_usd, last_exit, session_id }
    }

    // backoff between retries (not before first attempt)
    if (iteration > 1) {
      const delay = Math.min(BACKOFF_BASE_MS * Math.pow(1.5, iteration - 2), BACKOFF_MAX_MS)
      process.stderr.write(`ralph: retry in ${Math.round(delay / 1000)}s...\n`)
      await new Promise(r => setTimeout(r, delay))
    }

    // run the command
    const start = performance.now()
    let exit_code: number

    if (opts.fn) {
      // in-process mode: call function directly
      try {
        exit_code = await opts.fn()
      } catch (e) {
        process.stderr.write(`ralph: fn threw: ${e}\n`)
        exit_code = 1
      }
    } else if (opts.command) {
      // subprocess mode
      const spawn_opts: Record<string, unknown> = {
        stdout: "inherit",
        stderr: "inherit",
        stdin:  "inherit",
        env:    scrub_agent_env(),
        detached: true,
      }

      if (opts.timeout_ms > 0) {
        spawn_opts.timeout = opts.timeout_ms
      }

      const proc = Bun.spawn(opts.command, spawn_opts as any)
      assassin.track(proc.pid, proc.pid)
      exit_code = await proc.exited
      assassin.untrack(proc.pid)
    } else {
      throw new Error("ralph: either command or fn is required")
    }

    last_exit = exit_code

    const duration_ms = Math.round(performance.now() - start)

    // log
    log_iteration({
      session_id,
      iteration,
      exit_code,
      duration_ms,
      status: exit_code === 0 ? "success" : "retry",
    })

    // success?
    if (exit_code === 0) {
      return { status: "complete", iterations: iteration, budget_usd, last_exit, session_id }
    }
  }
}
