#!/usr/bin/env bun
//
// bny tasks — generate task list from spec + plan
//
// reads the spec + plan + worldview, calls claude to generate
// a concrete task checklist.
//
// usage:
//   bny tasks              # uses current feature
//   bny tasks 001-auth     # explicit feature
//   bny tasks --dry-run    # print prompt, don't run
//

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "./lib/result.ts"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { load_worldview, call_claude, strip_index_preamble } from "./lib/brane.ts"
import { which_check } from "./lib/spawn.ts"

export async function main(argv: string[]): Promise<number> {
  let target: string | null = null
  let dry_run = false

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny tasks [--dry-run] [feature-name]\n")
      return 0
    } else if (!arg.startsWith("-")) {
      target = arg
    }
  }

  const root = find_root()
  const name = target || current_feature()

  if (!name) {
    const result = error({ feature: [{ code: "not_found", message: "no feature specified and not on a feature branch" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  const paths = feature_paths(root, name)

  // guard: plan.md must exist
  if (!existsSync(paths.plan)) {
    const result = error({ plan: [{ code: "missing", message: `${paths.plan} does not exist — run bny plan first` }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  // guard: tasks.md already exists and is non-empty
  if (existsSync(paths.tasks)) {
    const existing = readFileSync(paths.tasks, "utf-8").trim()
    if (existing.length > 0) {
      const result = error({ tasks: [{ code: "exists", message: `${paths.tasks} already exists` }] })
      process.stdout.write(JSON.stringify(result, null, 2) + "\n")
      return 1
    }
  }

  // -- build prompt --

  const spec_content = existsSync(paths.spec)
    ? readFileSync(paths.spec, "utf-8").trim()
    : "(no spec)"

  const plan_content = readFileSync(paths.plan, "utf-8").trim()

  const prompt = [
    "You are writing a task checklist for implementing a software feature.",
    "",
    "# Feature Specification",
    "",
    spec_content,
    "",
    "---",
    "",
    "# Implementation Plan",
    "",
    plan_content,
    "",
    "---",
    "",
    `Feature: ${name}`,
    "",
    "Write a concrete task list in markdown with checkboxes. Requirements:",
    "",
    "1. Tasks organized by phase: Setup → Foundational → User Stories (by priority) → Polish.",
    "2. Each task has an ID (T001, T002, etc.).",
    "3. Mark parallelizable tasks with [P].",
    "4. Map tasks to user stories with [US1], [US2], etc.",
    "5. Include exact file paths in task descriptions.",
    "6. Each phase ends with a checkpoint.",
    "7. Tests are generated separately by the antagonist agent. Generate IMPLEMENTATION tasks only.",
    "8. Do NOT include test-writing tasks — tests already exist when implementation begins.",
    "",
    "Format: `- [ ] T001 [P] [US1] Description with exact file path`",
    "",
    "Be specific and actionable. Every task should be completable in one sitting.",
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

  process.stderr.write(`[tasks] generating tasks for: ${name}\n`)

  const raw = call_claude(prompt, root)
  if (!raw) {
    process.stderr.write("error: claude failed to generate tasks\n")
    return 1
  }

  // strip conversational preamble before first markdown heading
  const cleaned = strip_index_preamble(raw) ?? raw

  // write tasks
  const header = `# Tasks: ${name}\n\n`
  writeFileSync(paths.tasks, header + cleaned + "\n")

  const meta = {
    path: "/bny/tasks",
    timestamp: new Date().toISOString(),
    duration_ms: 0,
  }
  const result = success({ feature: name, tasks_file: paths.tasks }, meta)
  process.stdout.write(JSON.stringify(result, null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
