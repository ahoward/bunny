//
// state.ts — durable build pipeline state
//
// bny/state.md is the canonical cursor file for multi-session builds.
// agents read it at session start to know where things stand.
//

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"

// -- types --

export interface BuildState {
  feature:      string
  description:  string
  pipeline:     string        // "build" | "spike" | "next"
  step:         string        // current/last step
  step_status:  string        // "completed" | "failed" | "in_progress"
  narrow_round: number | null
  warnings:     string[]
  started_at:   string        // ISO timestamp
  updated_at:   string        // ISO timestamp
  constraints:  string[]
}

// -- init --

export function init_state(opts: {
  feature: string
  description: string
  pipeline: string
  constraints: string[]
}): BuildState {
  const now = new Date().toISOString()
  return {
    feature:      opts.feature,
    description:  opts.description,
    pipeline:     opts.pipeline,
    step:         "",
    step_status:  "pending",
    narrow_round: null,
    warnings:     [],
    started_at:   now,
    updated_at:   now,
    constraints:  opts.constraints,
  }
}

// -- update --

export function update_state(
  state: BuildState,
  step: string,
  step_status: string,
  narrow_round?: number | null,
): BuildState {
  return {
    ...state,
    step,
    step_status,
    narrow_round: narrow_round !== undefined ? narrow_round : state.narrow_round,
    updated_at: new Date().toISOString(),
  }
}

// -- write --

export function state_path(root: string): string {
  return resolve(root, "bny/state.md")
}

export function write_state(root: string, state: BuildState): void {
  const path = state_path(root)
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const warnings_block = state.warnings.length > 0
    ? state.warnings.map(w => `- ${w}`).join("\n")
    : "(none)"

  const constraints_block = state.constraints.length > 0
    ? state.constraints.map(c => `- ${c}`).join("\n")
    : "(none)"

  const narrow = state.narrow_round !== null ? String(state.narrow_round) : "-"

  const content = `# Build State

| Field | Value |
|-------|-------|
| feature | ${state.feature} |
| description | ${state.description} |
| pipeline | ${state.pipeline} |
| step | ${state.step} |
| step_status | ${state.step_status} |
| narrow_round | ${narrow} |
| started_at | ${state.started_at} |
| updated_at | ${state.updated_at} |

## Warnings

${warnings_block}

## Constraints

${constraints_block}
`

  writeFileSync(path, content)
}

// -- read --

export function read_state(root: string): BuildState | null {
  const path = state_path(root)
  if (!existsSync(path)) return null

  try {
    const content = readFileSync(path, "utf-8")
    const fields: Record<string, string> = {}

    // parse markdown table rows: | key | value |
    for (const line of content.split("\n")) {
      const m = line.match(/^\|\s*(\w+)\s*\|\s*(.*?)\s*\|$/)
      if (m && m[1] !== "Field") {
        fields[m[1]] = m[2]
      }
    }

    // required fields
    if (!fields.feature || !fields.pipeline || !fields.started_at || !fields.updated_at) {
      return null
    }

    // parse warnings
    const warnings: string[] = []
    const warnings_match = content.match(/## Warnings\n\n([\s\S]*?)(?=\n## |\n*$)/)
    if (warnings_match) {
      for (const line of warnings_match[1].split("\n")) {
        const bullet = line.match(/^- (.+)$/)
        if (bullet) warnings.push(bullet[1])
      }
    }

    // parse constraints
    const constraints: string[] = []
    const constraints_match = content.match(/## Constraints\n\n([\s\S]*?)(?=\n## |\n*$)/)
    if (constraints_match) {
      for (const line of constraints_match[1].split("\n")) {
        const bullet = line.match(/^- (.+)$/)
        if (bullet) constraints.push(bullet[1])
      }
    }

    return {
      feature:      fields.feature,
      description:  fields.description || "",
      pipeline:     fields.pipeline,
      step:         fields.step || "",
      step_status:  fields.step_status || "pending",
      narrow_round: fields.narrow_round && fields.narrow_round !== "-" ? parseInt(fields.narrow_round, 10) : null,
      warnings,
      started_at:   fields.started_at,
      updated_at:   fields.updated_at,
      constraints,
    }
  } catch {
    return null
  }
}

// -- load constraints from guardrails.json --

export function load_constraints(root: string): string[] {
  const path = resolve(root, "bny/guardrails.json")
  if (!existsSync(path)) return []
  try {
    const g = JSON.parse(readFileSync(path, "utf-8"))
    const c: string[] = []
    if (g.blast_radius && typeof g.blast_radius === "object") {
      for (const [k, v] of Object.entries(g.blast_radius)) {
        c.push(`${k}: ${v}`)
      }
    }
    return c
  } catch {
    return []
  }
}
