//
// src/lib/context.ts — boot context for pipeline phases
//
// assembles project state into a structured prompt block.
// phase-aware: different phases get different context slices.
//

import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { load_worldview } from "./brane.ts"
import { list_features, feature_paths } from "./feature.ts"
import { map_codebase, format_markdown, format_compact } from "./map.ts"
import { read_section } from "./prompt.ts"

// -- types --

export type Phase = "specify" | "plan" | "implement"
// note: "test-gen" is intentionally excluded — adversarial isolation

export interface BootContext {
  roadmap:         string | null
  worldview:       string | null
  decisions:       string | null
  guardrails:      string | null
  codebase_map:    string | null
  recent_specs:    string[]
  feature_history: string | null
}

// -- constants --

const MAX_MAP_CHARS = 80_000    // ~20k tokens at ~4 chars/token
const MAX_RECENT_SPECS = 5

// -- zero-state detection --

export function is_zero_state(root: string, ctx: BootContext): boolean {
  if (ctx.recent_specs.length > 0) return false

  // check decisions.md for user-added entries
  const decisions_path = resolve(root, "bny/decisions.md")
  if (!existsSync(decisions_path)) return true

  const content = readFileSync(decisions_path, "utf-8")
  const table_rows = content.split("\n").filter(line => line.trim().startsWith("|") && line.trim().length > 0)
  // header + separator = 2 rows; anything more means user-added entries
  return table_rows.length <= 2
}

// -- loaders --

function load_roadmap(root: string): string | null {
  const section = read_section("Roadmap", resolve(root, "bny/roadmap.md"))
  return section?.content ?? null
}

function load_decisions(root: string): string | null {
  const section = read_section("Decisions", resolve(root, "bny/decisions.md"))
  return section?.content ?? null
}

function load_guardrails(root: string): string | null {
  const section = read_section("Guardrails", resolve(root, "bny/guardrails.md"))
  return section?.content ?? null
}

function load_worldview_text(root: string): string | null {
  const sections = load_worldview(root)
  if (sections.length === 0) return null
  return sections.map(s => `## ${s.heading}\n\n${s.content}`).join("\n\n---\n\n")
}

function load_codebase_map(root: string): string | null {
  const scan_dirs = ["src", "lib", "tests", "bin"]
    .filter(d => existsSync(resolve(root, d)))

  if (scan_dirs.length === 0) return null

  // map_codebase is async but we need sync — use the sync path
  // for now, just try to read a cached map or return null
  // the actual map generation happens in the async wrapper
  return null
}

export async function load_codebase_map_async(root: string): Promise<string | null> {
  const scan_dirs = ["src", "lib", "tests", "bin"]
    .filter(d => existsSync(resolve(root, d)))

  if (scan_dirs.length === 0) return null

  try {
    const map = await map_codebase(root, scan_dirs)
    if (map.files.length === 0) return null

    const full = format_markdown(map)
    if (full.length < MAX_MAP_CHARS) return full

    // fall back to compact
    return format_compact(map)
  } catch {
    return null
  }
}

function load_recent_specs(root: string): string[] {
  const features = list_features(root)
  if (features.length === 0) return []

  const recent = features.slice(-MAX_RECENT_SPECS)
  const specs: string[] = []

  for (const feat of recent) {
    const paths = feature_paths(root, feat.name)
    if (!existsSync(paths.spec)) continue
    try {
      const content = readFileSync(paths.spec, "utf-8")
      const first_line = content.split("\n").find(l => l.trim().length > 0)
      if (first_line) specs.push(`${feat.name}: ${first_line.replace(/^#+\s*/, "")}`)
    } catch {
      // skip unreadable specs
    }
  }

  return specs
}

function load_feature_history(root: string): string | null {
  const roadmap_path = resolve(root, "bny/roadmap.md")
  if (!existsSync(roadmap_path)) return null

  const content = readFileSync(roadmap_path, "utf-8")
  const completed: string[] = []

  for (const line of content.split("\n")) {
    const match = line.match(/^-\s*\[x\]\s+(.+)$/i)
    if (match) completed.push(match[1])
  }

  return completed.length > 0 ? completed.join("\n") : null
}

// -- main loader --

export function load_boot_context(root: string, phase: Phase): BootContext {
  if ((phase as string) === "test-gen") {
    throw new Error("load_boot_context: test-gen must not receive boot context (adversarial isolation)")
  }

  const full_phases: Phase[] = ["specify", "plan"]
  const is_full = full_phases.includes(phase)

  return {
    roadmap:         is_full ? load_roadmap(root) : null,
    worldview:       is_full ? load_worldview_text(root) : null,
    decisions:       load_decisions(root),
    guardrails:      load_guardrails(root),
    codebase_map:    null,  // set via async wrapper — see load_boot_context_async
    recent_specs:    is_full ? load_recent_specs(root) : [],
    feature_history: (phase === "specify" || phase === "plan" || phase === "implement")
      ? load_feature_history(root) : null,
  }
}

export async function load_boot_context_async(root: string, phase: Phase): Promise<BootContext> {
  const ctx = load_boot_context(root, phase)

  // load codebase map async (tree-sitter)
  if (phase === "specify" || phase === "plan") {
    ctx.codebase_map = await load_codebase_map_async(root)
  } else if (phase === "implement") {
    // implement gets compact map only
    const scan_dirs = ["src", "lib", "tests", "bin"]
      .filter(d => existsSync(resolve(root, d)))
    if (scan_dirs.length > 0) {
      try {
        const map = await map_codebase(root, scan_dirs)
        ctx.codebase_map = map.files.length > 0 ? format_compact(map) : null
      } catch {
        ctx.codebase_map = null
      }
    }
  }

  return ctx
}

// -- renderer --

export function render_boot_context(root: string, ctx: BootContext): string {
  const zero = is_zero_state(root, ctx)
  const sections: string[] = []

  if (zero) {
    sections.push("# Project Context\n\nThis is a new project — establish the foundation.")
  } else {
    sections.push("# Project Context\n\nYou are evolving this codebase. Describe the delta, not a greenfield design.")
  }

  sections.push(render_field("Roadmap", ctx.roadmap))
  sections.push(render_field("Worldview", ctx.worldview))
  sections.push(render_field("Project Decisions", ctx.decisions))
  sections.push(render_field("Guardrails", ctx.guardrails))
  sections.push(render_field("Codebase Map", ctx.codebase_map))

  if (ctx.recent_specs.length > 0) {
    sections.push(`## Recent Specs\n\n${ctx.recent_specs.join("\n")}`)
  } else {
    sections.push("## Recent Specs\n\n(None yet)")
  }

  sections.push(render_field("Completed Features", ctx.feature_history))

  return sections.join("\n\n")
}

function render_field(heading: string, value: string | null): string {
  if (value === null) return `## ${heading}\n\n(None defined yet)`
  return `## ${heading}\n\n${value}`
}
