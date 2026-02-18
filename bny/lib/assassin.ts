//
// assassin.ts - process group tracking + cleanup
//
// ensures all child processes die when bny exits.
// pure in-memory tracking. no database.
//
// defense in depth:
//   1. signal traps (SIGINT/SIGTERM/SIGHUP) → SIGTERM children → wait → SIGKILL
//   2. exit event → synchronous SIGKILL (last resort)
//   3. pidfile at .bny/bny.pid for stale process detection
//
// every child is spawned with detached:true (own process group).
// PGID = child PID, so kill -TERM -$PID kills the whole group.
//

import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"

interface TrackedChild {
  pid:  number
  pgid: number
}

const children: Map<number, TrackedChild> = new Map()
let installed = false
let shutting_down = false
let pidfile_path: string | null = null

// -- public api --

export function track(pid: number, pgid: number | null = null): void {
  const effective_pgid = pgid ?? pid
  children.set(pid, { pid, pgid: effective_pgid })
}

export function untrack(pid: number): void {
  children.delete(pid)
}

export function install(bny_dir: string | null = null): void {
  if (installed) return
  installed = true

  // write pidfile
  if (bny_dir) {
    pidfile_path = resolve(bny_dir, "bny.pid")
    const dir = dirname(pidfile_path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    reap_stale_pidfile()
    writeFileSync(pidfile_path, String(process.pid))
  }

  // signal handlers
  const shutdown = async () => {
    if (shutting_down) return
    shutting_down = true
    await assassinate()
    cleanup_pidfile()
    process.exitCode = 1
  }

  process.on("SIGINT",  shutdown)
  process.on("SIGTERM", shutdown)
  process.on("SIGHUP",  shutdown)

  // last resort: synchronous kill on exit
  process.on("exit", () => {
    force_kill_all()
    cleanup_pidfile()
  })
}

// -- kill logic --

function kill_group(pgid: number, signal: string = "SIGTERM"): boolean {
  try {
    const sig_num = signal === "SIGKILL" ? "9" : "15"
    const result = Bun.spawnSync(["kill", `-${sig_num}`, `-${pgid}`])
    return result.exitCode === 0
  } catch {
    return false
  }
}

function kill_pid(pid: number, signal: string = "SIGTERM"): boolean {
  try {
    const sig_num = signal === "SIGKILL" ? 9 : 15
    process.kill(pid, sig_num)
    return true
  } catch {
    return false
  }
}

function is_alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function assassinate(grace_ms: number = 3000): Promise<void> {
  if (children.size === 0) return

  // phase 1: SIGTERM all process groups
  for (const [_pid, child] of children) {
    kill_group(child.pgid, "SIGTERM")
  }

  // phase 2: wait for graceful shutdown
  const deadline = Date.now() + grace_ms
  while (Date.now() < deadline) {
    let any_alive = false
    for (const [_pid, child] of children) {
      if (is_alive(child.pid)) {
        any_alive = true
        break
      }
    }
    if (!any_alive) break
    await new Promise(r => setTimeout(r, 100))
  }

  // phase 3: SIGKILL survivors
  force_kill_all()
}

function force_kill_all(): void {
  for (const [pid, child] of children) {
    kill_group(child.pgid, "SIGKILL")
    kill_pid(pid, "SIGKILL")
  }
  children.clear()
}

// -- pidfile --

function reap_stale_pidfile(): void {
  if (!pidfile_path || !existsSync(pidfile_path)) return

  try {
    const old_pid = parseInt(readFileSync(pidfile_path, "utf-8").trim(), 10)
    if (old_pid > 0 && !is_alive(old_pid)) {
      unlinkSync(pidfile_path)
    }
  } catch {
    // corrupt pidfile, remove it
    try { unlinkSync(pidfile_path!) } catch {}
  }
}

function cleanup_pidfile(): void {
  if (!pidfile_path) return
  try { unlinkSync(pidfile_path) } catch {}
}
