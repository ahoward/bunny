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
import { call_claude, strip_index_preamble } from "./lib/brane.ts"
import { which_check } from "./lib/spawn.ts"
import { read_input } from "./lib/input.ts"
import { load_boot_context_async, render_boot_context, is_zero_state } from "./lib/context.ts"

export async function main(argv: string[]): Promise<number> {
  // -- read_input: handle --input <path> and stdin (-) --

  const { text: input_text, rest_argv } = read_input(argv)

  // -- parse args --

  const args: string[] = []
  let number_override: number | null = null
  let dry_run = false
  let mode: "evolve" | "new" = "evolve"

  for (let i = 0; i < rest_argv.length; i++) {
    if (rest_argv[i] === "--number") {
      i++
      if (!rest_argv[i]) { process.stderr.write("error: --number requires a value\n"); return 1 }
      number_override = parseInt(rest_argv[i], 10)
      if (isNaN(number_override)) { process.stderr.write("error: --number must be a number\n"); return 1 }
    } else if (rest_argv[i] === "--dry-run") {
      dry_run = true
    } else if (rest_argv[i] === "--force-new") {
      mode = "new"
    } else if (rest_argv[i] === "--force-evolve") {
      mode = "evolve"
    } else if (rest_argv[i] === "--help" || rest_argv[i] === "-h") {
      process.stdout.write(`usage: bny specify [--number N] [--force-new|--force-evolve] [--dry-run] <description>

flags:
  --force-new       force greenfield mode
  --force-evolve    force iteration mode (default)

input:
  <text...>              inline text
  -                      read from stdin
  --input <path>         read from file
`)
      return 0
    } else {
      args.push(rest_argv[i])
    }
  }

  const description = input_text ?? args.join(" ").trim()
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

  // -- build prompt with boot context --

  const boot_ctx = await load_boot_context_async(root, "specify")
  const force_zero = mode === "new"
  const zero = force_zero || is_zero_state(root, boot_ctx)
  const boot_block = render_boot_context(root, force_zero
    ? { ...boot_ctx, recent_specs: [], feature_history: null }
    : boot_ctx)

  const today = new Date().toISOString().slice(0, 10)

  const task_instructions = zero ? [
    "You are writing a feature specification for a NEW software project.",
    "This is a greenfield project — establish the foundation.",
    "",
    "Write a complete feature specification in markdown. Include:",
    "",
    "1. **User Scenarios & Testing** — Prioritized user stories (P1, P2, P3) with acceptance scenarios (Given/When/Then). Each story must be independently testable.",
    "2. **Edge Cases** — Boundary conditions and error scenarios.",
    "3. **Requirements** — Functional requirements (FR-001, FR-002, etc.) with MUST/SHOULD language. Mark unclear items with [NEEDS CLARIFICATION].",
    "4. **Key Entities** — Core data types and their relationships.",
    "5. **Success Criteria** — Measurable outcomes.",
  ] : [
    "You are writing a CHANGE SPEC for an existing software project.",
    "Given the project context above, describe what changes to implement the user's request.",
    "",
    "This is NOT a greenfield spec. The codebase already exists. Your spec must:",
    "- Reference existing files, modules, and patterns from the codebase map",
    "- Describe the DELTA — what changes, what's added, what's modified",
    "- Respect existing project decisions and guardrails",
    "- Build on prior features listed in recent specs",
    "",
    "Write a change specification in markdown. Include:",
    "",
    "1. **Change Summary** — What changes and why. Reference existing code.",
    "2. **User Scenarios & Testing** — Prioritized user stories (P1, P2, P3) with acceptance scenarios (Given/When/Then). Each story must be independently testable.",
    "3. **Affected Files** — Which existing files are modified, which new files are created.",
    "4. **Edge Cases** — Boundary conditions and error scenarios, especially interactions with existing code.",
    "5. **Requirements** — Functional requirements (FR-001, FR-002, etc.) with MUST/SHOULD language.",
    "6. **Success Criteria** — Measurable outcomes.",
  ]

  const prompt = [
    boot_block,
    "",
    "---",
    "",
    "# Task",
    "",
    ...task_instructions,
    "",
    `# Feature to Specify: "${description}"`,
    `Feature branch: \`${feature_name}\``,
    `Date: ${today}`,
    "",
    "Be specific and concrete. Use the project context above to inform the design.",
    "Output ONLY the markdown content, no preamble or commentary.",
    "",
    "---",
    "",
    "# Reminder",
    "",
    zero
      ? "Write a complete feature specification for this new project."
      : "Write a change spec: given the project context above, describe what changes to implement the user's request.",
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
