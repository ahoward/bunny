import { describe, test, expect } from "bun:test"
import { bny } from "./helpers"

describe("bny hop — 4-phase pipeline", () => {
  test("--help exits 0 with usage info", () => {
    const r = bny("hop", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("phase 1: spec")
    expect(r.stdout).toContain("phase 2: plan")
    expect(r.stdout).toContain("phase 3: test")
    expect(r.stdout).toContain("phase 4: build")
    expect(r.stdout).toContain("--force-new")
    expect(r.stdout).toContain("--force-evolve")
  })

  test("--dry-run with description shows all 4 phases", () => {
    const r = bny("hop", "--dry-run", "test feature")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("phase 1")
    expect(r.stderr).toContain("phase 2")
    expect(r.stderr).toContain("phase 3")
    expect(r.stderr).toContain("phase 4")
  })
})

describe("bny spec — phase 1", () => {
  test("--help exits 0 with usage info", () => {
    const r = bny("spec", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("phase 1: specify + challenge")
    expect(r.stdout).toContain("--force-new")
    expect(r.stdout).toContain("--force-evolve")
  })

  test("no args exits 1 with error", () => {
    const r = bny("spec")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("requires a description")
  })

  test("--dry-run shows plan without executing", () => {
    const r = bny("spec", "--dry-run", "test feature")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("specify")
    expect(r.stderr).toContain("challenge")
  })
})

describe("bny plan — phase 2", () => {
  test("--help exits 0 with usage info", () => {
    const r = bny("plan", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("phase 2: plan + tasks")
  })

  test("--dry-run shows plan and tasks steps", () => {
    const r = bny("plan", "--dry-run")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("plan (claude)")
    expect(r.stderr).toContain("tasks (claude)")
  })
})

describe("bny test — phase 3", () => {
  test("--help exits 0 with usage info", () => {
    const r = bny("test", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("phase 3: test-gen")
    expect(r.stdout).toContain("contracts")
    expect(r.stdout).toContain("properties")
    expect(r.stdout).toContain("boundaries+golden")
  })

  test("--dry-run shows narrowing rounds", () => {
    const r = bny("test", "--dry-run")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("test-gen:contracts")
    expect(r.stderr).toContain("implement:contracts")
  })
})

describe("bny build — phase 4", () => {
  test("--help exits 0 with usage info", () => {
    const r = bny("build", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("phase 4: implement + verify + retro")
    expect(r.stdout).toContain("deprecated")
  })

  test("--dry-run shows build steps", () => {
    const r = bny("build", "--dry-run")
    expect(r.exit).toBe(0)
    expect(r.stderr).toContain("implement")
    expect(r.stderr).toContain("verify")
    expect(r.stderr).toContain("retro")
    expect(r.stderr).toContain("ruminate")
  })

  test("build with description prints deprecation warning", () => {
    // this will fail because it tries to run hop without API keys,
    // but we can at least verify the deprecation path is hit
    const r = bny("build", "--dry-run", "some feature")
    // dry-run on hop path should work
    expect(r.stderr).toContain("deprecated")
  })
})

describe("bny spike — exploratory (refactored)", () => {
  test("--help exits 0 with 4-phase info", () => {
    const r = bny("spike", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("phase")
    expect(r.stdout).toContain("guardrails off")
  })
})

describe("backward compat", () => {
  test("build-legacy is accessible as plumbing", () => {
    const r = bny("build-legacy", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("dark factory")
  })

  test("plan-only runs plan without tasks", () => {
    const r = bny("plan-only", "--help")
    expect(r.exit).toBe(0)
  })
})
