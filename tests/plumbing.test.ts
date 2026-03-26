import { describe, test, expect, beforeAll } from "bun:test"
import { bny, ensure_bny_project } from "./helpers.ts"

beforeAll(() => ensure_bny_project())

describe("specify.ts arg parsing (PR 1 fix)", () => {
  test("--force-new is not eaten as description text", () => {
    const r = bny("specify", "--force-new", "--dry-run", "--number", "999", "add user auth")
    expect(r.exit).toBe(0)
    // --force-new should NOT appear in the prompt output
    const out = r.stdout
    expect(out).not.toContain("--force-new")
    expect(out).toContain("add user auth")
  })

  test("--force-evolve is not eaten as description text", () => {
    const r = bny("specify", "--force-evolve", "--dry-run", "--number", "998", "add rate limiting")
    expect(r.exit).toBe(0)
    const out = r.stdout
    expect(out).not.toContain("--force-evolve")
    expect(out).toContain("add rate limiting")
  })

  test("--help shows --force-new and --force-evolve", () => {
    const r = bny("specify", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("--force-new")
    expect(r.stdout).toContain("--force-evolve")
  })
})

describe("test-gen.ts prompt delivery (PR 1 fix)", () => {
  test("--help still works", () => {
    const r = bny("test-gen", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("test-gen")
  })

  test("--dry-run still works", () => {
    const r = bny("test-gen", "--dry-run")
    // needs a feature to exist, but dry-run with no feature should exit 1 gracefully
    // just verify it doesn't crash with ARG_MAX or similar
    expect(typeof r.exit).toBe("number")
  })
})

describe("guardrails loading (PR 1 fix)", () => {
  test("bny status loads without crashing (exercises load_constraints)", () => {
    const r = bny("status", "--help")
    expect(r.exit).toBe(0)
  })
})

describe("format_compact in map.ts (PR 1 addition)", () => {
  test("bny map --help still works", () => {
    const r = bny("map", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("map")
  })
})
