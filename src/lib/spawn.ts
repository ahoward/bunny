//
// spawn.ts — centralized process spawning
//
// ONE way to spawn processes. always captures stdout+stderr.
// always produces perfect error messages. handles assassin tracking
// and timeout wrapping.
//

import * as assassin from "./assassin.ts"

// -- timeout detection (once at module load) --

const TIMEOUT_CMD: string | null = (() => {
  for (const cmd of ["timeout", "gtimeout"]) {
    const r = Bun.spawnSync(["which", cmd], { stdout: "pipe", stderr: "pipe" })
    if (r.exitCode === 0) return cmd
  }
  return null
})()

// -- types --

export interface SpawnSyncOpts {
  cmd: string[]
  cwd?: string
  env?: Record<string, string | undefined>
  stdin?: Buffer | string
  timeout?: number           // seconds — wraps with timeout/gtimeout if available
  label?: string             // for context in error messages
}

export interface SpawnResult {
  ok: boolean
  exit_code: number
  stdout: string
  stderr: string
  detail: string             // best error message: stderr || stdout || "exit code N"
  timed_out: boolean
}

export interface SpawnAsyncOpts {
  cmd: string[]
  cwd?: string
  env?: Record<string, string | undefined>
  stdin?: "inherit" | "ignore" | ReturnType<typeof Bun.file>
  stdout?: "inherit" | "pipe"
  stderr?: "inherit" | "pipe"
  assassin_dir?: string      // if set, install + track
  label?: string
}

export interface SpawnAsyncResult {
  ok: boolean
  exit_code: number
  stdout: string | null      // null if inherited
  stderr: string | null      // null if inherited
  detail: string
  timed_out: boolean
}

// -- spawn_sync --

export function spawn_sync(opts: SpawnSyncOpts): SpawnResult {
  // build command with optional timeout wrapper
  let cmd = opts.cmd
  if (opts.timeout && opts.timeout > 0 && TIMEOUT_CMD) {
    cmd = [TIMEOUT_CMD, String(opts.timeout), ...cmd]
  }

  const stdin_value = typeof opts.stdin === "string" ? Buffer.from(opts.stdin) : opts.stdin

  const proc = Bun.spawnSync(cmd, {
    stdout: "pipe",
    stderr: "pipe",
    stdin: stdin_value,
    cwd: opts.cwd,
    env: opts.env,
  })

  const exit_code = proc.exitCode ?? 1
  const stdout = new TextDecoder().decode(proc.stdout).trim()
  const stderr = new TextDecoder().decode(proc.stderr).trim()
  const timed_out = exit_code === 124

  let detail = ""
  if (!timed_out && exit_code !== 0) {
    detail = stderr || stdout || `exit code ${exit_code}`
  } else if (timed_out) {
    const secs = opts.timeout || "?"
    detail = `timed out after ${secs}s`
  }

  return {
    ok: exit_code === 0,
    exit_code,
    stdout,
    stderr,
    detail,
    timed_out,
  }
}

// -- spawn_async --

export async function spawn_async(opts: SpawnAsyncOpts): Promise<SpawnAsyncResult> {
  const stdout_mode = opts.stdout || "inherit"
  const stderr_mode = opts.stderr || "inherit"

  if (opts.assassin_dir) {
    assassin.install(opts.assassin_dir)
  }

  const proc = Bun.spawn(opts.cmd, {
    stdout: stdout_mode,
    stderr: stderr_mode,
    stdin: opts.stdin || "ignore",
    cwd: opts.cwd,
    env: opts.env,
    detached: true,
  })

  if (opts.assassin_dir) {
    assassin.track(proc.pid, proc.pid)
  }

  const exit_code = await proc.exited

  if (opts.assassin_dir) {
    assassin.untrack(proc.pid)
  }

  // capture piped output
  let stdout: string | null = null
  let stderr: string | null = null

  if (stdout_mode === "pipe") {
    stdout = await new Response(proc.stdout).text()
    stdout = stdout.trim()
  }
  if (stderr_mode === "pipe") {
    stderr = await new Response(proc.stderr).text()
    stderr = stderr.trim()
  }

  let detail = ""
  if (exit_code !== 0) {
    detail = (stderr || "") || (stdout || "") || `exit code ${exit_code}`
  }

  return {
    ok: exit_code === 0,
    exit_code,
    stdout,
    stderr,
    detail,
    timed_out: false,
  }
}

// -- which_check --

export function which_check(name: string): boolean {
  const r = Bun.spawnSync(["which", name], { stdout: "pipe", stderr: "pipe" })
  return r.exitCode === 0
}
