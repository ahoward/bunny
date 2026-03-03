import { describe, test, expect } from "bun:test"

// -- test cli via subprocess --

function bny(...args: string[]): { stdout: string, stderr: string, exit: number } {
  const proc = Bun.spawnSync(["bun", "bin/bny.ts", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: import.meta.dir + "/..",
    env: { ...process.env, BNY_NO_SPINNER: "1" },
  })
  return {
    stdout: new TextDecoder().decode(proc.stdout).trim(),
    stderr: new TextDecoder().decode(proc.stderr).trim(),
    exit: proc.exitCode ?? 1,
  }
}

describe("bny brane loop", () => {
  test("--help exits 0 and shows usage", () => {
    const r = bny("brane", "loop", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("loop")
    expect(r.stdout).toContain("--resume")
    expect(r.stdout).toContain("--rounds")
    expect(r.stdout).toContain("--propose")
  })

  test("list --help exits 0", () => {
    const r = bny("brane", "loop", "list", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
  })

  test("no goal and no resume exits 1", () => {
    const r = bny("brane", "loop")
    expect(r.exit).toBe(1)
    expect(r.stdout).toContain("required")
  })

  test("--resume nonexistent slug exits 1", () => {
    const r = bny("brane", "loop", "--resume", "nonexistent-loop-xyz-999")
    expect(r.exit).toBe(1)
    expect(r.stdout).toContain("not_found")
  })

  test("list with no loops exits 0", () => {
    const r = bny("brane", "loop", "list")
    expect(r.exit).toBe(0)
  })

  test("list --json with no loops returns empty array", () => {
    const r = bny("brane", "loop", "list", "--json")
    expect(r.exit).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(Array.isArray(parsed)).toBe(true)
  })

  test("--dry-run prints reflect prompt", () => {
    const r = bny("brane", "loop", "--dry-run", "test topic for dry run")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("Reflect Prompt")
    expect(r.stdout).toContain("Loop Goal")
    expect(r.stdout).toContain("test topic for dry run")
  })

  test("loop appears in bny help", () => {
    const r = bny("help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("loop")
  })

  test("loop appears in bny help --json", () => {
    const r = bny("help", "--json")
    expect(r.exit).toBe(0)
    const parsed = JSON.parse(r.stdout)
    const keys = parsed.commands.map((c: any) => c.key)
    expect(keys).toContain("brane/loop")
  })

  test("loop appears in bny brane namespace help", () => {
    const r = bny("brane")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("loop")
  })
})
