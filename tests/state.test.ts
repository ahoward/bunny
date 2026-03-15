import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { tmpdir } from "node:os"
import {
  init_state, update_state, write_state, read_state,
  load_constraints, state_path,
} from "../src/lib/state.ts"
import type { BuildState } from "../src/lib/state.ts"

let tmp: string

beforeEach(() => {
  tmp = resolve(tmpdir(), `bny-state-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(resolve(tmp, "bny"), { recursive: true })
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

// -- init_state --

describe("init_state", () => {
  test("creates correct defaults", () => {
    const s = init_state({
      feature: "001-auth",
      description: "add authentication",
      pipeline: "build",
      constraints: ["max_files_per_pr: 20"],
    })
    expect(s.feature).toBe("001-auth")
    expect(s.description).toBe("add authentication")
    expect(s.pipeline).toBe("build")
    expect(s.step).toBe("")
    expect(s.step_status).toBe("pending")
    expect(s.narrow_round).toBeNull()
    expect(s.warnings).toEqual([])
    expect(s.constraints).toEqual(["max_files_per_pr: 20"])
    expect(s.started_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(s.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

// -- update_state --

describe("update_state", () => {
  test("changes step and status", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "build", constraints: [] })
    const u = update_state(s, "plan", "completed")
    expect(u.step).toBe("plan")
    expect(u.step_status).toBe("completed")
  })

  test("preserves other fields", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "spike", constraints: ["c1"] })
    const u = update_state(s, "specify", "in_progress")
    expect(u.feature).toBe("f")
    expect(u.description).toBe("d")
    expect(u.pipeline).toBe("spike")
    expect(u.constraints).toEqual(["c1"])
    expect(u.started_at).toBe(s.started_at)
  })

  test("bumps updated_at", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "build", constraints: [] })
    // small delay to ensure timestamp differs
    const u = update_state(s, "plan", "completed")
    expect(u.updated_at).toBeDefined()
    // updated_at should be >= started_at
    expect(new Date(u.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(s.started_at).getTime())
  })

  test("sets narrow_round when provided", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "build", constraints: [] })
    const u = update_state(s, "narrow:contracts", "in_progress", 1)
    expect(u.narrow_round).toBe(1)
  })

  test("clears narrow_round with null", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "build", constraints: [] })
    const u1 = update_state(s, "narrow:contracts", "in_progress", 2)
    expect(u1.narrow_round).toBe(2)
    const u2 = update_state(u1, "verify", "in_progress", null)
    expect(u2.narrow_round).toBeNull()
  })

  test("preserves narrow_round when not provided", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "build", constraints: [] })
    const u1 = update_state(s, "narrow:contracts", "in_progress", 2)
    const u2 = update_state(u1, "narrow:contracts", "completed")
    expect(u2.narrow_round).toBe(2)
  })
})

// -- write_state / read_state round-trip --

describe("write_state + read_state", () => {
  test("round-trip preserves all fields", () => {
    const s = init_state({
      feature: "012-portal",
      description: "consumer portal",
      pipeline: "build",
      constraints: ["max_files_per_pr: 20", "max_lines_changed_per_pr: 500"],
    })
    s.step = "plan"
    s.step_status = "completed"
    s.narrow_round = null
    s.warnings = ["challenge"]

    write_state(tmp, s)
    const r = read_state(tmp)

    expect(r).not.toBeNull()
    expect(r!.feature).toBe("012-portal")
    expect(r!.description).toBe("consumer portal")
    expect(r!.pipeline).toBe("build")
    expect(r!.step).toBe("plan")
    expect(r!.step_status).toBe("completed")
    expect(r!.narrow_round).toBeNull()
    expect(r!.warnings).toEqual(["challenge"])
    expect(r!.constraints).toEqual(["max_files_per_pr: 20", "max_lines_changed_per_pr: 500"])
    expect(r!.started_at).toBe(s.started_at)
    expect(r!.updated_at).toBe(s.updated_at)
  })

  test("round-trip with narrow_round set", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "build", constraints: [] })
    const u = update_state(s, "narrow:properties", "in_progress", 2)
    write_state(tmp, u)
    const r = read_state(tmp)
    expect(r!.narrow_round).toBe(2)
  })

  test("round-trip with empty warnings and constraints", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "spike", constraints: [] })
    write_state(tmp, s)
    const r = read_state(tmp)
    expect(r!.warnings).toEqual([])
    expect(r!.constraints).toEqual([])
  })

  test("round-trip with multiple warnings", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "build", constraints: [] })
    s.warnings = ["challenge", "narrow", "verify"]
    write_state(tmp, s)
    const r = read_state(tmp)
    expect(r!.warnings).toEqual(["challenge", "narrow", "verify"])
  })
})

// -- read_state edge cases --

describe("read_state", () => {
  test("returns null when file missing", () => {
    expect(read_state(tmp)).toBeNull()
  })

  test("returns null on malformed content", () => {
    writeFileSync(resolve(tmp, "bny/state.md"), "this is not a state file\n")
    expect(read_state(tmp)).toBeNull()
  })

  test("returns null when required fields missing", () => {
    writeFileSync(resolve(tmp, "bny/state.md"), `# Build State

| Field | Value |
|-------|-------|
| feature | test |
`)
    expect(read_state(tmp)).toBeNull()
  })
})

// -- write_state markdown format --

describe("write_state markdown format", () => {
  test("contains expected markdown table", () => {
    const s = init_state({ feature: "001-auth", description: "auth", pipeline: "build", constraints: [] })
    write_state(tmp, s)
    const content = readFileSync(state_path(tmp), "utf-8")
    expect(content).toContain("# Build State")
    expect(content).toContain("| feature | 001-auth |")
    expect(content).toContain("| pipeline | build |")
    expect(content).toContain("| step_status | pending |")
  })

  test("warnings appear as bullet list", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "build", constraints: [] })
    s.warnings = ["challenge", "verify"]
    write_state(tmp, s)
    const content = readFileSync(state_path(tmp), "utf-8")
    expect(content).toContain("## Warnings")
    expect(content).toContain("- challenge")
    expect(content).toContain("- verify")
  })

  test("constraints appear as bullet list", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "build", constraints: ["max_files: 20"] })
    write_state(tmp, s)
    const content = readFileSync(state_path(tmp), "utf-8")
    expect(content).toContain("## Constraints")
    expect(content).toContain("- max_files: 20")
  })

  test("empty warnings shows (none)", () => {
    const s = init_state({ feature: "f", description: "d", pipeline: "build", constraints: [] })
    write_state(tmp, s)
    const content = readFileSync(state_path(tmp), "utf-8")
    expect(content).toMatch(/## Warnings\n\n\(none\)/)
  })
})

// -- load_constraints --

describe("load_constraints", () => {
  test("reads blast_radius from guardrails.json", () => {
    writeFileSync(resolve(tmp, "bny/guardrails.json"), JSON.stringify({
      version: "1.0.0",
      blast_radius: {
        max_files_per_pr: 20,
        max_lines_changed_per_pr: 500,
        max_new_dependencies: 0,
      },
    }))
    const c = load_constraints(tmp)
    expect(c).toContain("max_files_per_pr: 20")
    expect(c).toContain("max_lines_changed_per_pr: 500")
    expect(c).toContain("max_new_dependencies: 0")
  })

  test("returns empty array when no guardrails.json", () => {
    expect(load_constraints(tmp)).toEqual([])
  })

  test("handles malformed JSON gracefully", () => {
    writeFileSync(resolve(tmp, "bny/guardrails.json"), "not json{{{")
    expect(load_constraints(tmp)).toEqual([])
  })

  test("handles missing blast_radius key", () => {
    writeFileSync(resolve(tmp, "bny/guardrails.json"), JSON.stringify({ version: "1.0.0" }))
    expect(load_constraints(tmp)).toEqual([])
  })
})

// -- state_path --

describe("state_path", () => {
  test("returns correct path", () => {
    expect(state_path("/foo/bar")).toBe("/foo/bar/bny/state.md")
  })
})
