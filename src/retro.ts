#!/usr/bin/env bun
//
// bny retro — lightweight retrospective on what was built
//
// narrow context: git diff + bny/state.md + bny/roadmap.md only.
// no worldview, no lenses, no spec/plan loading. fast.
// writes specs/<feature>/retro.md.
//
// for full worldview integration, use `bny ruminate` instead.
//
// usage:
//   bny retro                    # retro on current feature
//   bny retro "feature-name"     # explicit feature
//   bny retro --dry-run          # print prompt, don't run
//

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "./lib/result.ts"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { call_claude_structured } from "./lib/brane.ts"
import { create_spinner } from "./lib/spinner.ts"
import { which_check } from "./lib/spawn.ts"
import { spawn_sync } from "./lib/spawn.ts"

// -- schema --

interface RetroResponse {
  patterns:   string[]
  decisions:  string[]
  surprises:  string[]
  risks:      string[]
  summary:    string
}

const RETRO_SCHEMA = {
  type: "object",
  properties: {
    patterns:  { type: "array", items: { type: "string" }, description: "reusable approaches that emerged" },
    decisions: { type: "array", items: { type: "string" }, description: "key decisions and their rationale" },
    surprises: { type: "array", items: { type: "string" }, description: "unexpected findings or lessons" },
    risks:     { type: "array", items: { type: "string" }, description: "fragile areas, concerns, tech debt" },
    summary:   { type: "string", description: "one-paragraph retrospective" },
  },
  required: ["patterns", "decisions", "surprises", "risks", "summary"],
}

// -- main --

export async function main(argv: string[]): Promise<number> {
  let dry_run = false
  let explicit_feature: string | null = null

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny retro [--dry-run] [feature-name]

lightweight retrospective on what was built.
narrow context: git diff + state + roadmap only. fast.
writes specs/<feature>/retro.md.

for full worldview integration, use 'bny ruminate' instead.

flags:
  --dry-run    print prompt, don't call claude
`)
      return 0
    } else if (!arg.startsWith("-")) {
      explicit_feature = arg
    }
  }

  function meta() {
    return { path: "/bny/retro", timestamp: new Date().toISOString(), duration_ms: 0 }
  }

  const root = find_root()

  // -- resolve feature --

  const feature = explicit_feature || current_feature()
  if (!feature) {
    process.stdout.write(JSON.stringify(error({
      feature: [{ code: "not_found", message: "not on a feature branch and no feature specified" }]
    }, meta()), null, 2) + "\n")
    return 1
  }

  const paths = feature_paths(root, feature)

  process.stderr.write(`[retro] feature: ${feature}\n`)

  // -- gather narrow context (git diff + state + roadmap only) --

  const MAX_DIFF_CHARS = 50_000

  function read_file(label: string, path: string): string | null {
    if (!existsSync(path)) return null
    const content = readFileSync(path, "utf-8").trim()
    if (content.length === 0) return null
    return `## ${label}\n\n${content}`
  }

  function git_output(args: string[]): string {
    const r = spawn_sync({ cmd: ["git", ...args], cwd: root, label: "git" })
    return r.ok ? r.stdout : ""
  }

  const sections: string[] = []

  // build state (bny/state.md)
  const state_section = read_file("Build State", resolve(root, "bny/state.md"))
  if (state_section) sections.push(state_section)

  // roadmap (bny/roadmap.md)
  const roadmap_section = read_file("Roadmap", resolve(root, "bny/roadmap.md"))
  if (roadmap_section) sections.push(roadmap_section)

  // git summary
  const diff_stat = git_output(["diff", "main...HEAD", "--stat"])
  if (diff_stat) sections.push(`## Git Summary (--stat)\n\n\`\`\`\n${diff_stat}\n\`\`\``)

  const log_oneline = git_output(["log", "--oneline", "main..HEAD"])
  if (log_oneline) sections.push(`## Commits\n\n\`\`\`\n${log_oneline}\n\`\`\``)

  // full diff (truncated)
  let full_diff = git_output(["diff", "main...HEAD"])
  if (full_diff) {
    if (full_diff.length > MAX_DIFF_CHARS) {
      full_diff = full_diff.slice(0, MAX_DIFF_CHARS) + `\n\n[truncated — ${full_diff.length} chars total, showing first ${MAX_DIFF_CHARS}]`
    }
    sections.push(`## Full Diff\n\n\`\`\`diff\n${full_diff}\n\`\`\``)
  }

  if (sections.length === 0) {
    process.stderr.write("nothing to retro — no diff or state found\n")
    return 0
  }

  const context = sections.join("\n\n---\n\n")

  // -- check claude --

  if (!dry_run && !which_check("claude")) {
    process.stdout.write(JSON.stringify(error({
      claude: [{ code: "not_found", message: "claude CLI not found on PATH" }]
    }, meta()), null, 2) + "\n")
    return 1
  }

  // -- prompt --

  const prompt = `# What Was Built

Feature: ${feature}

${context}

---

# Instructions

You are writing a quick retrospective on this implementation. Focus on:
- **Patterns**: reusable approaches that emerged
- **Decisions**: key choices made and why (e.g. "used X instead of Y because...")
- **Surprises**: unexpected findings, lessons learned
- **Risks**: fragile areas, tech debt introduced, concerns for the future

Be specific and concise. Reference actual code and decisions, not generic advice.
Your response will be validated against a JSON schema.
`

  if (dry_run) {
    process.stdout.write(prompt + "\n")
    return 0
  }

  // -- call claude --

  const spin = create_spinner(`retro: ${feature}`)
  const response = call_claude_structured<RetroResponse>(prompt, root, RETRO_SCHEMA, "retro")
  spin.stop(response ? `retro: ${feature}` : undefined)

  if (!response) {
    process.stdout.write(JSON.stringify(error({
      parse: [{ code: "invalid_json", message: "could not get structured response from claude" }]
    }, meta()), null, 2) + "\n")
    return 1
  }

  // -- write retro.md --

  const retro_md = format_retro(feature, response)
  const feature_dir = paths.dir

  if (!existsSync(feature_dir)) mkdirSync(feature_dir, { recursive: true })
  const retro_path = resolve(feature_dir, "retro.md")
  writeFileSync(retro_path, retro_md)
  process.stderr.write(`wrote: ${retro_path}\n`)

  // -- output --

  process.stdout.write(JSON.stringify(success({
    feature,
    mode: "retro",
    path: retro_path,
    ...response,
  }, meta()), null, 2) + "\n")
  return 0
}

function format_retro(feature: string, r: RetroResponse): string {
  const lines: string[] = []
  lines.push(`# Retrospective: ${feature}`)
  lines.push(r.summary)
  lines.push("")

  if (r.patterns.length > 0) {
    lines.push("## Patterns")
    lines.push("")
    for (const p of r.patterns) lines.push(`- ${p}`)
    lines.push("")
  }

  if (r.decisions.length > 0) {
    lines.push("## Decisions")
    lines.push("")
    for (const d of r.decisions) lines.push(`- ${d}`)
    lines.push("")
  }

  if (r.surprises.length > 0) {
    lines.push("## Surprises")
    lines.push("")
    for (const s of r.surprises) lines.push(`- ${s}`)
    lines.push("")
  }

  if (r.risks.length > 0) {
    lines.push("## Risks")
    lines.push("")
    for (const k of r.risks) lines.push(`- ${k}`)
    lines.push("")
  }

  return lines.join("\n")
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
