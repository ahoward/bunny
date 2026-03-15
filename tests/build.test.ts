import { describe, test, expect, beforeAll } from "bun:test"
import { bny, ensure_bny_project } from "./helpers.ts"

beforeAll(() => ensure_bny_project())

describe("bny build", () => {
  test("--help exits 0 and shows usage", () => {
    const r = bny("build", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("build")
    expect(r.stdout).toContain("specify")
    expect(r.stdout).toContain("implement")
    expect(r.stdout).toContain("--dry-run")
  })

  test("no description and no feature exits 1", () => {
    const r = bny("build")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("no current feature")
  })

  test("--dry-run prints pipeline steps with narrowing", () => {
    const r = bny("build", "--dry-run", "test feature for dry run")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("would run")
    expect(r.stderr).toContain("specify")
    expect(r.stderr).toContain("challenge")
    expect(r.stderr).toContain("plan")
    expect(r.stderr).toContain("tasks")
    expect(r.stderr).toContain("narrow 3×3")
    expect(r.stderr).toContain("test-gen:contracts")
    expect(r.stderr).toContain("implement:contracts")
    expect(r.stderr).toContain("test-gen:properties")
    expect(r.stderr).toContain("implement:properties")
    expect(r.stderr).toContain("test-gen:boundaries+golden")
    expect(r.stderr).toContain("implement:boundaries+golden")
    expect(r.stderr).toContain("verify")
    expect(r.stderr).toContain("retro")
  })

  test("step --dry-run prints step name", () => {
    const r = bny("build", "implement", "--dry-run")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("implement")
  })

  test("specify step requires description", () => {
    const r = bny("build", "specify")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("requires a description")
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

describe("bny spike", () => {
  test("--help exits 0 and shows usage", () => {
    const r = bny("spike", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("spike")
    expect(r.stdout).toContain("guardrails")
    expect(r.stdout).toContain("implement")
  })

  test("no description and no feature exits 1", () => {
    const r = bny("spike")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("no current feature")
  })

  test("--dry-run prints full pipeline steps with narrowing", () => {
    const r = bny("spike", "--dry-run", "test spike dry run")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("would run")
    expect(r.stderr).toContain("specify")
    expect(r.stderr).toContain("challenge")
    expect(r.stderr).toContain("plan")
    expect(r.stderr).toContain("tasks")
    expect(r.stderr).toContain("narrow 3×3")
    expect(r.stderr).toContain("test-gen:contracts")
    expect(r.stderr).toContain("implement:contracts")
    expect(r.stderr).toContain("verify")
    expect(r.stderr).toContain("retro")
  })

  test("specify step requires description", () => {
    const r = bny("spike", "specify")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("requires a description")
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
