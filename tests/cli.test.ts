import { describe, test, expect } from "bun:test"
import { bny } from "./helpers.ts"

describe("cli dispatch", () => {
  test("bare bny shows help and exits 1", () => {
    const r = bny()
    expect(r.exit).toBe(1)
    expect(r.stdout).toContain("bny — the bunny dark factory CLI")
  })

  test("bny --help exits 0", () => {
    const r = bny("--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("bny — the bunny dark factory CLI")
  })

  test("bny help exits 0", () => {
    const r = bny("help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("bny — the bunny dark factory CLI")
  })

  test("bny help --json outputs valid JSON", () => {
    const r = bny("help", "--json")
    expect(r.exit).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed).toHaveProperty("commands")
    expect(parsed).toHaveProperty("namespaces")
    expect(Array.isArray(parsed.commands)).toBe(true)
    expect(parsed.commands.length).toBeGreaterThan(0)
  })

  test("bny help brane shows namespace help", () => {
    const r = bny("help", "brane")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("bny brane commands:")
    expect(r.stdout).toContain("rebuild")
    expect(r.stdout).toContain("ask")
    expect(r.stdout).toContain("lens")
    expect(r.stdout).toContain("tldr")
  })

  test("bny brane (bare namespace) shows namespace help", () => {
    const r = bny("brane")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("bny brane commands:")
  })

  test("unknown command exits 1 with error", () => {
    const r = bny("nonexistent")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("unknown command 'nonexistent'")
  })

  test("subcommand --help is passed through", () => {
    const r = bny("status", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
  })
})

describe("arg parsing", () => {
  test("--max-iter with invalid value shows error", () => {
    const r = bny("--max-iter", "abc", "status")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("invalid --max-iter")
  })

  test("--max-budget with invalid value shows error", () => {
    const r = bny("--max-budget", "xyz", "status")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("invalid --max-budget")
  })

  test("--timeout with invalid value shows error", () => {
    const r = bny("--timeout", "nope", "status")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("invalid --timeout")
  })

  test("--effort unknown shows error", () => {
    const r = bny("--effort", "mega", "status")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("unknown effort level")
  })

  test("--effort some is accepted", () => {
    const r = bny("--effort", "some", "status", "--help")
    // should reach the command (status --help) without arg parse error
    expect(r.stderr).not.toContain("unknown effort level")
  })

  test("--model flag is accepted", () => {
    const r = bny("--model", "claude-sonnet-4-20250514", "status", "--help")
    // should reach the command (status --help) without arg parse error
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
  })
})

describe("help text", () => {
  test("help shows --model option", () => {
    const r = bny("help")
    expect(r.stdout).toContain("--model")
    expect(r.stdout).toContain("BNY_MODEL")
  })
})

describe("command registry consistency", () => {
  test("help --json commands all have required fields", () => {
    const r = bny("help", "--json")
    const parsed = JSON.parse(r.stdout)
    for (const cmd of parsed.commands) {
      expect(typeof cmd.name).toBe("string")
      expect(typeof cmd.key).toBe("string")
      expect(typeof cmd.desc).toBe("string")
      expect(typeof cmd.group).toBe("string")
      expect(cmd.desc.length).toBeGreaterThan(0)
    }
  })

  test("every group is in GROUP_ORDER", () => {
    const r = bny("help", "--json")
    const parsed = JSON.parse(r.stdout)
    const groups = new Set(parsed.commands.map((c: any) => c.group))
    const known = new Set(["pipeline", "development", "knowledge", "chores", "plumbing"])
    for (const g of groups) {
      expect(known.has(g as string)).toBe(true)
    }
  })

  test("namespaces include brane, dev", () => {
    const r = bny("help", "--json")
    const parsed = JSON.parse(r.stdout)
    expect(parsed.namespaces).toContain("brane")
    expect(parsed.namespaces).toContain("dev")
  })
})
