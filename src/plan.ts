#!/usr/bin/env bun
//
// bny plan — generate implementation plan from spec + worldview
//
// reads the spec + brane worldview, calls claude to generate
// a concrete implementation plan.
//
// usage:
//   bny plan              # uses current feature
//   bny plan 001-auth     # explicit feature
//   bny plan --dry-run    # print prompt, don't run
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
      process.stdout.write("usage: bny plan [--dry-run] [feature-name]\n")
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

  // guard: spec.md must exist
  if (!existsSync(paths.spec)) {
    const result = error({ spec: [{ code: "missing", message: `${paths.spec} does not exist — run bny specify first` }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  // guard: plan.md already exists and is non-empty
  if (existsSync(paths.plan)) {
    const existing = readFileSync(paths.plan, "utf-8").trim()
    if (existing.length > 0) {
      const result = error({ plan: [{ code: "exists", message: `${paths.plan} already exists` }] })
      process.stdout.write(JSON.stringify(result, null, 2) + "\n")
      return 1
    }
  }

  // -- build prompt --

  const spec_content = readFileSync(paths.spec, "utf-8").trim()

  const worldview = load_worldview(root)
  const worldview_block = worldview.length > 0
    ? worldview.map(s => `## ${s.heading}\n\n${s.content}`).join("\n\n---\n\n")
    : "(no worldview)"

  const today = new Date().toISOString().slice(0, 10)

  const prompt = [
    "You are writing an implementation plan for a software feature.",
    "",
    "# Project Knowledge (from the brane/worldview)",
    "",
    worldview_block,
    "",
    "---",
    "",
    "# Feature Specification",
    "",
    spec_content,
    "",
    "---",
    "",
    `Feature: ${name}`,
    `Date: ${today}`,
    "",
    "Write a concrete implementation plan in markdown. Include:",
    "",
    "1. **Summary** — Primary requirement + technical approach.",
    "2. **Technical Context** — Language, dependencies, testing framework, target platform.",
    "3. **Project Structure** — Concrete file/directory layout with real paths.",
    "4. **Implementation Phases** — Ordered steps, each with clear deliverables.",
    "5. **Dependencies & Execution Order** — What blocks what, parallel opportunities.",
    "",
    "Be specific: use real file paths, real module names, real function signatures.",
    "The plan should be actionable enough that a developer (or AI agent) can follow it step by step.",
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

  process.stderr.write(`[plan] generating plan for: ${name}\n`)

  const raw = call_claude(prompt, root)
  if (!raw) {
    process.stderr.write("error: claude failed to generate plan\n")
    return 1
  }

  // strip conversational preamble before first markdown heading
  const cleaned = strip_index_preamble(raw) ?? raw

  // write plan
  const header = `# Implementation Plan: ${name}\n\n**Date**: ${today}\n**Spec**: specs/${name}/spec.md\n\n`
  writeFileSync(paths.plan, header + cleaned + "\n")

  const meta = {
    path: "/bny/plan",
    timestamp: new Date().toISOString(),
    duration_ms: 0,
  }
  const result = success({ feature: name, plan_file: paths.plan }, meta)
  process.stdout.write(JSON.stringify(result, null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
