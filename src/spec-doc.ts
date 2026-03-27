#!/usr/bin/env bun
//
// bny spec-doc — generate/update tests/SPEC.md from feature spec
//
// reads the feature spec (spec.md + challenge.md) and the existing SPEC.md,
// produces an updated behavioral specification with traceable IDs.
//
// SPEC.md is the human-readable behavioral contract. every line maps to a test.
// every test maps back to a SPEC line. the mapping is the review surface.
//
// usage:
//   bny spec-doc                    # update SPEC.md for current feature
//   bny spec-doc 001-auth           # explicit feature
//   bny spec-doc --dry-run          # show prompt, don't execute
//

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { call_claude, strip_index_preamble } from "./lib/brane.ts"
import { which_check } from "./lib/spawn.ts"

export async function main(argv: string[]): Promise<number> {
  let target: string | null = null
  let dry_run = false

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny spec-doc [--dry-run] [feature-name]\n")
      process.stdout.write("\ngenerate/update tests/SPEC.md — the behavioral specification.\n")
      return 0
    } else if (arg === "--dry-run") {
      dry_run = true
    } else if (!arg.startsWith("-")) {
      target = arg
    }
  }

  const root = find_root()
  const name = target || current_feature()

  if (!name) {
    process.stderr.write("error: no feature specified and not on a feature branch\n")
    return 1
  }

  const paths = feature_paths(root, name)

  if (!existsSync(paths.spec)) {
    process.stderr.write(`error: ${paths.spec} does not exist — run bny spec first\n`)
    return 1
  }

  // -- gather inputs --

  const spec_content = readFileSync(paths.spec, "utf-8")
  const challenge_path = resolve(paths.dir, "challenge.md")
  const challenge_content = existsSync(challenge_path)
    ? readFileSync(challenge_path, "utf-8")
    : null

  const existing_spec_md = existsSync(paths.spec_md)
    ? readFileSync(paths.spec_md, "utf-8")
    : null

  // -- build prompt --

  const prompt = [
    "# Task",
    "",
    "You are updating the project's behavioral specification (SPEC.md).",
    "SPEC.md is a human-readable document that describes every meaningful behavior",
    "in the system. It is the review surface — a domain expert reads this to verify",
    "the system is correct.",
    "",
    "## Rules",
    "",
    "1. Every behavior gets a unique ID: `<DOMAIN>-<NNN>` (e.g., PL-001, AUTH-003).",
    "2. Each ID maps 1:1 to a contract test. The test references the ID in its name.",
    "3. Use plain English. A PM or domain expert must understand every line.",
    "4. Organize by domain/module. Use markdown headers for sections.",
    "5. Mark behaviors as MUST (required) or SHOULD (desired).",
    "6. Include edge cases and error behaviors — not just happy paths.",
    "7. Keep it minimal — no redundancy, no noise. ~200-400 lines total.",
    "8. If a behavior is being changed, update the existing line — don't duplicate.",
    "9. If a behavior is being removed, delete the line.",
    "",
    existing_spec_md
      ? [
          "## Existing SPEC.md",
          "",
          "The current behavioral spec is below. Update it to incorporate the new feature.",
          "Do NOT rewrite from scratch — preserve existing IDs and sections.",
          "Add new behaviors, update changed behaviors, remove deleted behaviors.",
          "",
          "```markdown",
          existing_spec_md,
          "```",
        ].join("\n")
      : [
          "## No existing SPEC.md",
          "",
          "This is the first behavioral spec. Create it from scratch.",
          "Start with the feature described below.",
        ].join("\n"),
    "",
    "## Feature Specification",
    "",
    spec_content,
    "",
    challenge_content
      ? `## Adversary Challenge\n\n${challenge_content}\n`
      : "",
    "---",
    "",
    "Output ONLY the markdown content for SPEC.md. No preamble or commentary.",
    "Start with `# SPEC` as the first line.",
  ].join("\n")

  if (dry_run) {
    process.stdout.write(prompt + "\n")
    return 0
  }

  // -- generate --

  if (!which_check("claude")) {
    process.stderr.write("error: claude CLI not found on PATH\n")
    return 1
  }

  process.stderr.write(`[spec-doc] generating SPEC.md for: ${name}\n`)

  const raw = call_claude(prompt, root)
  if (!raw) {
    process.stderr.write("error: claude failed to generate SPEC.md\n")
    return 1
  }

  const cleaned = strip_index_preamble(raw) ?? raw

  writeFileSync(paths.spec_md, cleaned.trim() + "\n")
  process.stderr.write(`[spec-doc] wrote ${paths.spec_md}\n`)

  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
