#!/usr/bin/env bun
//
// bny specify — create a feature spec from the brane
//
// reads the worldview + roadmap item, calls claude to generate
// a real feature specification, writes specs/<name>/spec.md
//
// usage:
//   bny specify "Add user authentication"
//   bny specify "user auth" --number 5
//

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "./lib/result.ts"
import {
  find_root, current_feature, next_feature_number, generate_branch_name,
  feature_paths,
} from "./lib/feature.ts"
import { load_worldview, call_claude, strip_index_preamble } from "./lib/brane.ts"
import { which_check } from "./lib/spawn.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  const args: string[] = []
  let number_override: number | null = null
  let dry_run = false

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--number") {
      i++
      if (!argv[i]) { process.stderr.write("error: --number requires a value\n"); return 1 }
      number_override = parseInt(argv[i], 10)
      if (isNaN(number_override)) { process.stderr.write("error: --number must be a number\n"); return 1 }
    } else if (argv[i] === "--dry-run") {
      dry_run = true
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      process.stdout.write("usage: bny specify [--number N] [--dry-run] <description>\n")
      return 0
    } else {
      args.push(argv[i])
    }
  }

  const description = args.join(" ").trim()
  if (!description) {
    process.stderr.write("usage: bny specify [--number N] [--dry-run] <description>\n")
    return 1
  }

  // -- main --

  const root = find_root()

  // guard: if a current feature already exists with a spec, don't re-specify
  const existing = current_feature()
  if (existing && !number_override) {
    const existing_paths = feature_paths(root, existing)
    if (existsSync(existing_paths.spec)) {
      process.stderr.write(`[specify] feature already active: ${existing}\n`)
      process.stderr.write(`  spec: ${existing_paths.spec}\n`)
      return 0
    }
  }

  const feature_num = number_override ?? next_feature_number(root)
  const suffix = generate_branch_name(description)
  const padded = String(feature_num).padStart(3, "0")
  const feature_name = `${padded}-${suffix}`

  // create spec dir
  const paths = feature_paths(root, feature_name)
  mkdirSync(paths.dir, { recursive: true })

  // -- build prompt from worldview --

  const worldview = load_worldview(root)
  const worldview_block = worldview.length > 0
    ? worldview.map(s => `## ${s.heading}\n\n${s.content}`).join("\n\n---\n\n")
    : "(no worldview yet)"

  const today = new Date().toISOString().slice(0, 10)

  const prompt = [
    "You are writing a feature specification for a software project.",
    "",
    "# Project Knowledge (from the brane/worldview)",
    "",
    worldview_block,
    "",
    "---",
    "",
    `# Feature to Specify: "${description}"`,
    `Feature branch: \`${feature_name}\``,
    `Date: ${today}`,
    "",
    "Write a complete feature specification in markdown. Include:",
    "",
    "1. **User Scenarios & Testing** — Prioritized user stories (P1, P2, P3) with acceptance scenarios (Given/When/Then). Each story must be independently testable.",
    "2. **Edge Cases** — Boundary conditions and error scenarios.",
    "3. **Requirements** — Functional requirements (FR-001, FR-002, etc.) with MUST/SHOULD language. Mark unclear items with [NEEDS CLARIFICATION].",
    "4. **Key Entities** — Core data types and their relationships.",
    "5. **Success Criteria** — Measurable outcomes.",
    "",
    "Be specific and concrete. Use the worldview knowledge to inform the design.",
    "Output ONLY the markdown content, no preamble or commentary.",
  ].join("\n")

  if (dry_run) {
    process.stdout.write(prompt + "\n")
    return 0
  }

  // -- check claude --

  if (!which_check("claude")) {
    process.stderr.write("error: claude CLI not found on PATH\n")
    return 1
  }

  // -- call claude --

  process.stderr.write(`[specify] generating spec for: ${description}\n`)

  const raw = call_claude(prompt, root)
  if (!raw) {
    process.stderr.write("error: claude failed to generate spec\n")
    return 1
  }

  // strip conversational preamble before first markdown heading
  const cleaned = strip_index_preamble(raw) ?? raw

  // write spec
  const header = `# Feature Specification: ${description}\n\n**Feature Branch**: \`${feature_name}\`\n**Created**: ${today}\n**Status**: Draft\n\n`
  writeFileSync(paths.spec, header + cleaned + "\n")

  // output
  const meta = {
    path: "/bny/specify",
    timestamp: new Date().toISOString(),
    duration_ms: 0,
  }
  const result = success({
    feature_name,
    feature_num: padded,
    spec_file: paths.spec,
  }, meta)
  process.stdout.write(JSON.stringify(result, null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
