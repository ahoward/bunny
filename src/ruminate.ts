#!/usr/bin/env bun
//
// bny ruminate — reflect on what was built, feed insights into the brane
//
// after implementing a feature, ruminate gathers the spec, plan, tasks,
// and git diff, then asks claude to extract durable knowledge.
// insights are applied to the worldview using the same machinery as brane eat.
//
// usage:
//   bny ruminate                    # ruminate on current feature
//   bny ruminate "feature-name"     # explicit feature
//   bny ruminate --dry-run          # print prompt, don't run
//   bny ruminate --yes              # skip confirmation
//

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "./lib/result.ts"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import {
  ensure_brane, load_worldview, load_active_lenses,
  call_claude, parse_json, apply_operations,
  preview_operations, print_intake_diff, confirm_intake,
  regenerate_index,
} from "./lib/brane.ts"
import type { EatResponse } from "./lib/brane.ts"
import { create_spinner } from "./lib/spinner.ts"
import { spawn_sync, which_check } from "./lib/spawn.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  let dry_run = false
  let auto_yes = false
  let explicit_feature: string | null = null

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--yes" || arg === "-y") {
      auto_yes = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny ruminate [--dry-run] [--yes] [feature-name]

reflects on what was built and feeds insights into the brane.
gathers spec, plan, tasks, and git changes as context.

flags:
  --dry-run    print prompt, don't call claude
  --yes, -y    skip confirmation, apply immediately
`)
      return 0
    } else if (!arg.startsWith("-")) {
      explicit_feature = arg
    }
  }

  function meta() {
    return { path: "/bny/ruminate", timestamp: new Date().toISOString(), duration_ms: 0 }
  }

  // -- setup --

  const root = find_root()
  ensure_brane(root)

  // -- resolve feature --

  const feature = explicit_feature || current_feature()
  if (!feature) {
    process.stdout.write(JSON.stringify(error({
      feature: [{ code: "not_found", message: "not on a feature branch and no feature specified" }]
    }, meta()), null, 2) + "\n")
    return 1
  }

  const paths = feature_paths(root, feature)

  // guard: spec must exist (minimum context)
  if (!existsSync(paths.spec)) {
    process.stdout.write(JSON.stringify(error({
      spec: [{ code: "not_found", message: `no spec found at ${paths.spec}` }]
    }, meta()), null, 2) + "\n")
    return 1
  }

  process.stderr.write(`[ruminate] feature: ${feature}\n`)

  // -- gather context --

  const MAX_DIFF_CHARS = 50_000

  function read_section(label: string, path: string): string | null {
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

  // spec (required)
  const spec_section = read_section("Specification", paths.spec)
  if (spec_section) sections.push(spec_section)

  // plan (optional)
  const plan_section = read_section("Implementation Plan", paths.plan)
  if (plan_section) sections.push(plan_section)

  // tasks (optional)
  const tasks_section = read_section("Task List", paths.tasks)
  if (tasks_section) sections.push(tasks_section)

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

  // -- load brane context --

  const lenses = load_active_lenses(root)
  const worldview = load_worldview(root)

  const lens_block = lenses.length > 0
    ? lenses.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
    : "(no active lenses)"

  const worldview_block = worldview.length > 0
    ? worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
    : "(empty worldview)"

  // -- build prompt --

  const ruminate_prompt = `# Active Lenses

${lens_block}

---

# Current Worldview

${worldview_block}

---

# What Was Built

Feature: ${feature}

${sections.join("\n\n---\n\n")}

---

# Instructions

You are reflecting on a completed implementation cycle. Your job is to extract
durable knowledge — patterns, decisions, architectural insights, lessons —
and integrate them into the worldview.

Filter through all active lenses above. Focus on:
- **Patterns** that emerged during implementation (reusable approaches)
- **Decisions** made and their rationale (why X over Y)
- **Gaps** discovered (things the worldview was missing)
- **Risks** surfaced (fragile areas, security concerns, scaling limits)

Do NOT record:
- Session-specific details (branch names, PR numbers, timestamps)
- Ephemeral build state (test output, specific error messages)
- Information already well-captured in the worldview

For each insight worth keeping:
- Decide if it belongs in an existing worldview file (update) or needs a new one (create)
- When updating, include the FULL new content for the file (not just the diff)
- Keep files focused on a single topic
- Use clear markdown with headers
- Every file MUST start with an H1 heading, then a one-sentence TL;DR on the next line (no blank line between heading and TL;DR). Example:
  # Topic Name
  One sentence summarizing this file's core idea.

Respond with ONLY valid JSON (no markdown fences):
{
  "operations": [
    {"action": "create", "path": "relative/path.md", "content": "full markdown content"},
    {"action": "update", "path": "existing/path.md", "content": "full replacement content"}
  ],
  "reasoning": "brief explanation of what was extracted and what was skipped"
}

Paths are relative to worldview/. Use lowercase-kebab-case for file and directory names.
If nothing durable emerged, return empty operations with reasoning explaining why.
`

  // -- dry run --

  if (dry_run) {
    process.stdout.write(ruminate_prompt + "\n")
    return 0
  }

  // -- check claude --

  if (!which_check("claude")) {
    process.stdout.write(JSON.stringify(error({
      claude: [{ code: "not_found", message: "claude CLI not found on PATH" }]
    }, meta()), null, 2) + "\n")
    return 1
  }

  // -- call claude --

  const spin = create_spinner(`ruminating on: ${feature}`)

  const raw = call_claude(ruminate_prompt, root)
  if (!raw) {
    spin.stop()
    return 1
  }

  let response = parse_json<EatResponse>(raw)
  if (!response) {
    spin.stop()
    process.stderr.write("warning: failed to parse response, retrying...\n")
    const spin2 = create_spinner(`retrying: ${feature}`)
    const retry = call_claude(ruminate_prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences.", root)
    spin2.stop()
    if (!retry) { return 1 }
    response = parse_json<EatResponse>(retry)
    if (!response) {
      process.stdout.write(JSON.stringify(error({
        parse: [{ code: "invalid_json", message: "could not get structured response from claude" }]
      }, meta()), null, 2) + "\n")
      return 1
    }
  } else {
    spin.stop(`🐰 ruminated on: ${feature}`)
  }

  // -- intake gate --

  if (response.operations.length > 0) {
    const diffs = preview_operations(root, response.operations)
    print_intake_diff(diffs, response.reasoning)

    if (!auto_yes) {
      if (!confirm_intake()) {
        process.stderr.write("aborted\n")
        return 0
      }
    }

    // -- apply operations --

    apply_operations(root, response.operations)
    process.stderr.write(`applied ${response.operations.length} operation(s)\n`)

    await regenerate_index(root)
  } else {
    process.stderr.write("nothing to absorb — no durable insights extracted\n")
  }

  // -- output --

  const result_data = {
    feature,
    operations: response.operations.map(op => ({ action: op.action, path: op.path })),
    reasoning: response.reasoning,
  }

  process.stdout.write(JSON.stringify(success(result_data, meta()), null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
