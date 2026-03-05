import { describe, test, expect } from "bun:test"
import { spawn_sync, spawn_async, which_check } from "../src/lib/spawn.ts"

describe("spawn_sync", () => {
  test("captures stdout from successful command", () => {
    const r = spawn_sync({ cmd: ["echo", "hello"] })
    expect(r.ok).toBe(true)
    expect(r.exit_code).toBe(0)
    expect(r.stdout).toBe("hello")
    expect(r.detail).toBe("")
    expect(r.timed_out).toBe(false)
  })

  test("captures stderr from failed command", () => {
    const r = spawn_sync({ cmd: ["bash", "-c", "echo oops >&2; exit 1"] })
    expect(r.ok).toBe(false)
    expect(r.exit_code).toBe(1)
    expect(r.stderr).toBe("oops")
    expect(r.detail).toBe("oops")
  })

  test("falls back to stdout when stderr is empty on failure", () => {
    const r = spawn_sync({ cmd: ["bash", "-c", "echo fallback; exit 1"] })
    expect(r.ok).toBe(false)
    expect(r.detail).toBe("fallback")
  })

  test("falls back to exit code when both streams empty", () => {
    const r = spawn_sync({ cmd: ["bash", "-c", "exit 42"] })
    expect(r.ok).toBe(false)
    expect(r.exit_code).toBe(42)
    expect(r.detail).toBe("exit code 42")
  })

  test("accepts stdin as string", () => {
    const r = spawn_sync({ cmd: ["cat"], stdin: "piped input" })
    expect(r.ok).toBe(true)
    expect(r.stdout).toBe("piped input")
  })

  test("accepts stdin as Buffer", () => {
    const r = spawn_sync({ cmd: ["cat"], stdin: Buffer.from("buffer input") })
    expect(r.ok).toBe(true)
    expect(r.stdout).toBe("buffer input")
  })
})

describe("spawn_async", () => {
  test("captures piped stdout from successful command", async () => {
    const r = await spawn_async({ cmd: ["echo", "async hello"], stdout: "pipe", stderr: "pipe" })
    expect(r.ok).toBe(true)
    expect(r.exit_code).toBe(0)
    expect(r.stdout).toBe("async hello")
    expect(r.timed_out).toBe(false)
  })

  test("captures piped stderr from failed command", async () => {
    const r = await spawn_async({ cmd: ["bash", "-c", "echo bad >&2; exit 1"], stdout: "pipe", stderr: "pipe" })
    expect(r.ok).toBe(false)
    expect(r.stderr).toBe("bad")
    expect(r.detail).toBe("bad")
  })

  test("returns null for inherited streams", async () => {
    const r = await spawn_async({ cmd: ["true"] })
    expect(r.ok).toBe(true)
    expect(r.stdout).toBeNull()
    expect(r.stderr).toBeNull()
  })
})

describe("which_check", () => {
  test("returns true for a command that exists", () => {
    expect(which_check("echo")).toBe(true)
  })

  test("returns false for a command that does not exist", () => {
    expect(which_check("definitely_not_a_real_command_xyz")).toBe(false)
  })
})
