#!/usr/bin/env bun
//
// bny challenge — gemini adversary hardens the spec
//
// reads the spec, asks gemini to find gaps, edge cases, ambiguities.
// writes specs/<name>/challenge.md with findings.
//
// usage:
//   bny challenge                    # current feature
//   bny challenge 001-auth           # explicit feature
//   bny challenge --prompt-only      # write prompt file instead
//

import { existsSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "./lib/result.ts"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { read_section, build_prompt } from "./lib/prompt.ts"
import { call_claude, strip_index_preamble } from "./lib/brane.ts"
import { spawn_async, which_check, create_sandbox } from "./lib/spawn.ts"

export async function main(argv: string[]): Promise<number> {
  let target: string | null = null
  let prompt_only = false

  for (const arg of argv) {
    if (arg === "--prompt-only") {
      prompt_only = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny challenge [--prompt-only] [feature-name]\n")
      process.stdout.write("\nasks gemini to harden the spec — find gaps, edge cases, ambiguities.\n")
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

  if (!existsSync(paths.spec)) {
    const result = error({ spec: [{ code: "missing", message: `${paths.spec} does not exist — run bny specify first` }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  // -- build prompt --

  const sections = [
    read_section("Feature Specification", paths.spec),
  ].filter((s): s is NonNullable<typeof s> => s !== null)

  const instructions = [
    "You are the ADVERSARY. Your job is to break this specification before anyone builds it.",
    "",
    "You MUST use the semi-formal reasoning structure below. Fill in every section.",
    "Do not skip sections. Do not free-form ramble. The structure IS the analysis.",
    "",
    "## PREMISES",
    "",
    "State what the spec claims. One premise per requirement or behavior.",
    "",
    "```",
    "P1: The spec claims [behavior] — source: [section/requirement ID]",
    "P2: The spec claims [behavior] — source: [section/requirement ID]",
    "...",
    "```",
    "",
    "## ANALYSIS",
    "",
    "For each premise, apply ALL of the following checks:",
    "",
    "```",
    "PREMISE: P[N]",
    "  AMBIGUITY CHECK: Can this be interpreted more than one way?",
    "    [yes/no] — if yes, state the alternative interpretation",
    "  EDGE CASE CHECK: What inputs/states are not covered?",
    "    [list concrete values or states]",
    "  ERROR PATH CHECK: What happens when this fails?",
    "    [specified/unspecified] — if unspecified, state what's missing",
    "  SECURITY CHECK: Can this be exploited?",
    "    [yes/no/n-a] — if yes, state the attack vector",
    "  CONCURRENCY CHECK: What if two callers do this simultaneously?",
    "    [safe/unsafe/n-a] — if unsafe, state the race condition",
    "```",
    "",
    "## FINDINGS",
    "",
    "For each gap discovered in the analysis above, state:",
    "",
    "### Finding [N]: [title]",
    "",
    "- **Gap**: What is missing or wrong",
    "- **Severity**: critical / high / medium / low",
    "- **Evidence**: Which premise(s) and which check exposed this (e.g., P3 EDGE CASE CHECK)",
    "- **Scenario**: A concrete Given/When/Then test scenario that exposes the gap",
    "- **Alternative interpretation**: What a reasonable developer might INCORRECTLY assume",
    "",
    "## CONCLUSION",
    "",
    "```",
    "Premises examined: [N]",
    "Findings: [N] (critical: [N], high: [N], medium: [N], low: [N])",
    "Spec is [READY/NOT READY] for implementation because [evidence from findings]",
    "```",
    "",
    "Do NOT rubber-stamp. If you find nothing wrong, look harder.",
    "A challenge that finds zero issues is a failed challenge.",
    "",
    "Output ONLY the structured markdown above. No preamble or commentary.",
  ].join("\n")

  const prompt = build_prompt(sections, instructions)

  // -- prompt-only mode --

  if (prompt_only) {
    const prompt_file = resolve(paths.dir, "challenge-prompt.md")
    await Bun.write(prompt_file, prompt)
    const meta = { path: "/bny/challenge", timestamp: new Date().toISOString(), duration_ms: 0 }
    process.stdout.write(JSON.stringify(success({ feature: name, prompt_file }, meta), null, 2) + "\n")
    return 0
  }

  // -- shell out to gemini --

  if (!which_check("gemini")) {
    const result = error({ gemini: [{ code: "not_found", message: "gemini CLI not found on PATH — use --prompt-only to generate the prompt file instead" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  process.stderr.write(`[challenge] hardening spec for: ${name}\n`)

  const sandbox = create_sandbox(root)
  const model = process.env.BNY_MODEL || null
  const cmd: string[] = ["gemini", "-p", prompt]
  if (model) cmd.push("--model", model)

  const r = await spawn_async({
    cmd,
    cwd: sandbox.cwd,
    env: sandbox.env,
    stdout: "pipe",
    stderr: "inherit",
    assassin_dir: resolve(root, "bny"),
    label: "gemini challenge",
  })

  if (!r.ok || !r.stdout) {
    process.stderr.write(`error: gemini challenge failed: ${r.detail}\n`)
    return r.exit_code
  }

  // strip preamble and write
  const cleaned = strip_index_preamble(r.stdout) ?? r.stdout.trim()
  const challenge_path = resolve(paths.dir, "challenge.md")
  writeFileSync(challenge_path, `# Challenge: ${name}\n\n${cleaned}\n`)

  process.stderr.write(`[challenge] wrote ${challenge_path}\n`)

  const meta = { path: "/bny/challenge", timestamp: new Date().toISOString(), duration_ms: 0 }
  process.stdout.write(JSON.stringify(success({ feature: name, challenge_file: challenge_path }, meta), null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
