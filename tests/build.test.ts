import { describe, test, expect, beforeAll } from "bun:test"
import { bny, ensure_bny_project } from "./helpers.ts"

beforeAll(() => ensure_bny_project())

describe("bny build (phase 4)", () => {
  test("--help exits 0 and shows phase 4 usage", () => {
    const r = bny("build", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("phase 4")
    expect(r.stdout).toContain("implement")
    expect(r.stdout).toContain("verify")
    expect(r.stdout).toContain("--dry-run")
  })

  test("--dry-run prints phase 4 steps", () => {
    const r = bny("build", "--dry-run")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("implement")
    expect(r.stderr).toContain("verify")
    expect(r.stderr).toContain("retro")
    expect(r.stderr).toContain("ruminate")
  })

  test("build with description prints deprecation and delegates to hop", () => {
    const r = bny("build", "--dry-run", "test feature for dry run")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("deprecated")
    // delegates to hop --dry-run
    expect(r.stderr).toContain("phase 1")
  })

  test("build appears in bny help", () => {
    const r = bny("help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("build")
  })

  test("build appears in bny help --json", () => {
    const r = bny("help", "--json")
    expect(r.exit).toBe(0)
    const parsed = JSON.parse(r.stdout)
    const keys = parsed.commands.map((c: any) => c.key)
    expect(keys).toContain("build")
  })
})

describe("bny build-legacy (old full pipeline)", () => {
  test("--help exits 0 and shows old pipeline usage", () => {
    const r = bny("build-legacy", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("dark factory")
    expect(r.stdout).toContain("specify")
    expect(r.stdout).toContain("implement")
  })

  test("step --dry-run prints step name", () => {
    const r = bny("build-legacy", "implement", "--dry-run")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("implement")
  })

  test("specify step requires description", () => {
    const r = bny("build-legacy", "specify")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("requires a description")
  })
})

describe("bny spike (refactored)", () => {
  test("--help exits 0 and shows usage", () => {
    const r = bny("spike", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("spike")
    expect(r.stdout).toContain("guardrails")
  })

  test("--dry-run with description shows 4-phase pipeline", () => {
    const r = bny("spike", "--dry-run", "test spike feature")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("phase 1")
    expect(r.stderr).toContain("phase 2")
    expect(r.stderr).toContain("phase 3")
    expect(r.stderr).toContain("phase 4")
  })

  test("--dry-run prints 4-phase pipeline", () => {
    const r = bny("spike", "--dry-run", "test spike dry run")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("phase 1")
    expect(r.stderr).toContain("phase 2")
    expect(r.stderr).toContain("phase 3")
    expect(r.stderr).toContain("phase 4")
  })

  test("spike appears in bny help", () => {
    const r = bny("help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("spike")
  })

  test("spike appears in bny help --json", () => {
    const r = bny("help", "--json")
    expect(r.exit).toBe(0)
    const parsed = JSON.parse(r.stdout)
    const keys = parsed.commands.map((c: any) => c.key)
    expect(keys).toContain("spike")
  })
})

describe("bny challenge", () => {
  test("--help exits 0 and shows usage", () => {
    const r = bny("challenge", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("challenge")
  })

  test("challenge appears in bny help --json", () => {
    const r = bny("help", "--json")
    expect(r.exit).toBe(0)
    const parsed = JSON.parse(r.stdout)
    const keys = parsed.commands.map((c: any) => c.key)
    expect(keys).toContain("challenge")
  })
})

describe("bny test-gen", () => {
  test("--help exits 0 and shows usage", () => {
    const r = bny("test-gen", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("test-gen")
  })

  test("test-gen appears in bny help --json", () => {
    const r = bny("help", "--json")
    expect(r.exit).toBe(0)
    const parsed = JSON.parse(r.stdout)
    const keys = parsed.commands.map((c: any) => c.key)
    expect(keys).toContain("test-gen")
  })
})

describe("bny verify", () => {
  test("--help exits 0 and shows usage", () => {
    const r = bny("verify", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("verify")
  })

  test("verify appears in bny help --json", () => {
    const r = bny("help", "--json")
    expect(r.exit).toBe(0)
    const parsed = JSON.parse(r.stdout)
    const keys = parsed.commands.map((c: any) => c.key)
    expect(keys).toContain("verify")
  })
})
