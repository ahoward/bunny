import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  load_boot_context,
  load_boot_context_async,
  render_boot_context,
  is_zero_state,
} from "../src/lib/context.ts"
import type { Phase, BootContext } from "../src/lib/context.ts"

// -- test fixtures --

const TMP = resolve(import.meta.dir, "fixtures/context-test")

function setup_empty_project() {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(resolve(TMP, "bny"), { recursive: true })
}

function setup_fresh_project() {
  setup_empty_project()
  writeFileSync(resolve(TMP, "bny/roadmap.md"), "# Roadmap\n\n## Next\n\n## Done\n")
  writeFileSync(resolve(TMP, "bny/decisions.md"), "# Decision Log\n\n| Date | Decision | Rationale |\n|------|----------|-----------|\n")
  writeFileSync(resolve(TMP, "bny/guardrails.md"), "# Guardrails\n\n- No classes for data\n- snake_case everything\n")
}

function setup_full_project() {
  setup_fresh_project()
  // add decisions
  writeFileSync(resolve(TMP, "bny/decisions.md"),
    "# Decision Log\n\n| Date | Decision | Rationale |\n|------|----------|-----------|\n| 2026-01-01 | Use POD only | simplicity |\n| 2026-01-02 | snake_case | consistency |\n"
  )
  // add roadmap with completed items
  writeFileSync(resolve(TMP, "bny/roadmap.md"),
    "# Roadmap\n\n## Next\n\n- [ ] add boot context\n\n## Done\n\n- [x] bny version\n- [x] bny hop\n"
  )
  // add specs
  mkdirSync(resolve(TMP, "specs/001-auth"), { recursive: true })
  writeFileSync(resolve(TMP, "specs/001-auth/spec.md"), "# Feature Specification: Add auth\n\nAuthentication system.")
  mkdirSync(resolve(TMP, "specs/002-api"), { recursive: true })
  writeFileSync(resolve(TMP, "specs/002-api/spec.md"), "# Feature Specification: Add API\n\nREST API endpoints.")
  // add source
  mkdirSync(resolve(TMP, "src/lib"), { recursive: true })
  writeFileSync(resolve(TMP, "src/index.ts"), "export function main() { return 0 }")
}

function cleanup() {
  rmSync(TMP, { recursive: true, force: true })
}

// -- tests --

describe("load_boot_context", () => {
  afterAll(cleanup)

  test("throws for test-gen phase (adversarial isolation)", () => {
    setup_empty_project()
    expect(() => load_boot_context(TMP, "test-gen" as any)).toThrow("adversarial isolation")
  })

  test("empty project (no bny/ files) — graceful degradation", () => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(resolve(TMP, "bny"), { recursive: true })
    const ctx = load_boot_context(TMP, "specify")
    expect(ctx.roadmap).toBeNull()
    expect(ctx.worldview).toBeNull()
    expect(ctx.decisions).toBeNull()
    expect(ctx.guardrails).toBeNull()
    expect(ctx.codebase_map).toBeNull()
    expect(ctx.recent_specs).toEqual([])
    expect(ctx.feature_history).toBeNull()
  })

  test("fresh project (bny init only) — zero-state detected", () => {
    setup_fresh_project()
    const ctx = load_boot_context(TMP, "specify")
    expect(is_zero_state(TMP, ctx)).toBe(true)
    expect(ctx.guardrails).not.toBeNull()
    expect(ctx.guardrails).toContain("snake_case")
  })

  test("project with specs but no worldview — partial context", () => {
    setup_full_project()
    const ctx = load_boot_context(TMP, "specify")
    expect(ctx.worldview).toBeNull()
    expect(ctx.recent_specs.length).toBe(2)
    expect(ctx.recent_specs[0]).toContain("001-auth")
    expect(ctx.recent_specs[1]).toContain("002-api")
  })

  test("project with full state — all fields populated", () => {
    setup_full_project()
    const ctx = load_boot_context(TMP, "specify")
    expect(ctx.roadmap).not.toBeNull()
    expect(ctx.decisions).not.toBeNull()
    expect(ctx.guardrails).not.toBeNull()
    expect(ctx.recent_specs.length).toBe(2)
    expect(ctx.feature_history).not.toBeNull()
    expect(ctx.feature_history).toContain("bny version")
    expect(ctx.feature_history).toContain("bny hop")
  })

  test("implement phase returns null for roadmap, worldview, recent_specs", () => {
    setup_full_project()
    const ctx = load_boot_context(TMP, "implement")
    expect(ctx.roadmap).toBeNull()
    expect(ctx.worldview).toBeNull()
    expect(ctx.recent_specs).toEqual([])
    // but decisions and guardrails are present
    expect(ctx.decisions).not.toBeNull()
    expect(ctx.guardrails).not.toBeNull()
    // feature_history present for implement
    expect(ctx.feature_history).not.toBeNull()
  })

  test("specify phase gets everything (except async map)", () => {
    setup_full_project()
    const ctx = load_boot_context(TMP, "specify")
    expect(ctx.roadmap).not.toBeNull()
    expect(ctx.decisions).not.toBeNull()
    expect(ctx.guardrails).not.toBeNull()
    expect(ctx.recent_specs.length).toBeGreaterThan(0)
    expect(ctx.feature_history).not.toBeNull()
  })

  test("plan phase gets everything (except async map)", () => {
    setup_full_project()
    const ctx = load_boot_context(TMP, "plan")
    expect(ctx.roadmap).not.toBeNull()
    expect(ctx.decisions).not.toBeNull()
    expect(ctx.guardrails).not.toBeNull()
    expect(ctx.recent_specs.length).toBeGreaterThan(0)
  })
})

describe("is_zero_state", () => {
  afterAll(cleanup)

  test("true when decisions.md does not exist", () => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(resolve(TMP, "bny"), { recursive: true })
    const ctx: BootContext = {
      roadmap: null, worldview: null, decisions: null, guardrails: null,
      codebase_map: null, recent_specs: [], feature_history: null,
    }
    expect(is_zero_state(TMP, ctx)).toBe(true)
  })

  test("true when decisions.md has only header rows", () => {
    setup_fresh_project()
    const ctx: BootContext = {
      roadmap: null, worldview: null, decisions: "header", guardrails: null,
      codebase_map: null, recent_specs: [], feature_history: null,
    }
    expect(is_zero_state(TMP, ctx)).toBe(true)
  })

  test("false when decisions.md has user entries", () => {
    setup_full_project()
    const ctx: BootContext = {
      roadmap: null, worldview: null, decisions: "stuff", guardrails: null,
      codebase_map: null, recent_specs: [], feature_history: null,
    }
    expect(is_zero_state(TMP, ctx)).toBe(false)
  })

  test("false when recent_specs is non-empty", () => {
    setup_fresh_project()
    const ctx: BootContext = {
      roadmap: null, worldview: null, decisions: null, guardrails: null,
      codebase_map: null, recent_specs: ["001-auth: Add auth"], feature_history: null,
    }
    expect(is_zero_state(TMP, ctx)).toBe(false)
  })
})

describe("render_boot_context", () => {
  afterAll(cleanup)

  test("zero-state shows foundation message", () => {
    setup_fresh_project()
    const ctx = load_boot_context(TMP, "specify")
    const rendered = render_boot_context(TMP, ctx)
    expect(rendered).toContain("establish the foundation")
    expect(rendered).not.toContain("Describe the delta")
  })

  test("non-zero-state shows evolve message", () => {
    setup_full_project()
    const ctx = load_boot_context(TMP, "specify")
    const rendered = render_boot_context(TMP, ctx)
    expect(rendered).toContain("Describe the delta")
    expect(rendered).not.toContain("establish the foundation")
  })

  test("null fields render as (None defined yet)", () => {
    setup_empty_project()
    const ctx = load_boot_context(TMP, "specify")
    const rendered = render_boot_context(TMP, ctx)
    expect(rendered).toContain("(None defined yet)")
  })

  test("populated fields render their content", () => {
    setup_full_project()
    const ctx = load_boot_context(TMP, "specify")
    const rendered = render_boot_context(TMP, ctx)
    expect(rendered).toContain("snake_case")
    expect(rendered).toContain("POD only")
    expect(rendered).toContain("001-auth")
    expect(rendered).toContain("bny version")
  })

  test("empty recent_specs renders (None yet)", () => {
    setup_fresh_project()
    const ctx = load_boot_context(TMP, "specify")
    const rendered = render_boot_context(TMP, ctx)
    expect(rendered).toContain("(None yet)")
  })
})

describe("malformed input handling", () => {
  afterAll(cleanup)

  test("malformed decisions.md (no table) — still loads", () => {
    setup_fresh_project()
    writeFileSync(resolve(TMP, "bny/decisions.md"), "just some random text\nno table here\n")
    const ctx = load_boot_context(TMP, "specify")
    expect(ctx.decisions).not.toBeNull()
    expect(ctx.decisions).toContain("just some random text")
  })

  test("specs dir missing — no crash", () => {
    setup_fresh_project()
    // no specs/ dir at all
    const ctx = load_boot_context(TMP, "specify")
    expect(ctx.recent_specs).toEqual([])
  })
})
