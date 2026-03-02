#!/usr/bin/env bun
//
// bny brane storm — divergent brainstorming against the brane
//
// "brane storming." takes a seed (text, file, or URL) and generates
// new ideas, questions, POV suggestions, and source recommendations.
// goes OUTWARD — expands, not summarizes.
//
// usage:
//   bny brane storm "what if we added real-time collaboration?"
//   bny brane storm seed.md
//   bny brane storm https://some-article.com
//   bny brane storm                          # storm on current worldview
//   bny brane storm --rounds 3              # multi-round with reload
//   bny brane storm --dry-run               # print prompt
//   bny brane storm --yes                   # skip confirmation
//

import { success, error } from "../../src/lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_source, load_worldview, load_active_povs,
  call_claude, parse_json, apply_operations,
  preview_operations, print_intake_diff, confirm_intake,
  regenerate_index, print_storm_suggestions,
} from "../lib/brane.ts"
import type { StormResponse, StormSuggestion } from "../lib/brane.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  let dry_run = false
  let auto_yes = false
  let rounds = 1
  const input_parts: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--yes" || arg === "-y") {
      auto_yes = true
    } else if (arg === "--rounds" && i + 1 < argv.length) {
      rounds = parseInt(argv[i + 1], 10)
      if (isNaN(rounds) || rounds < 1) rounds = 1
      i++
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny brane storm [--dry-run] [--yes] [--rounds N] [seed]

seed can be inline text, a file path, directory, or URL.
if no seed is given, storms on the current worldview.

flags:
  --dry-run      print prompt, don't call claude
  --yes, -y      skip confirmation, apply immediately
  --rounds N     multi-round brainstorming (default: 1)
`)
      return 0
    } else {
      input_parts.push(arg)
    }
  }

  const seed_input = input_parts.join(" ").trim() || null

  function meta() {
    return { path: "/bny/brane/storm", timestamp: new Date().toISOString(), duration_ms: 0 }
  }

  // -- setup --

  const root = find_root()
  ensure_brane(root)

  // -- load seed --

  let seed_content: string | null = null
  let seed_label = "(no seed — storming on worldview)"

  if (seed_input) {
    const loaded = load_source(seed_input, root)
    if (loaded) {
      seed_content = loaded.content
      seed_label = loaded.label
    } else {
      // treat as inline text
      seed_content = seed_input
      seed_label = "inline"
    }
  }

  // -- check claude --

  if (!dry_run) {
    const claude_check = Bun.spawnSync(["which", "claude"], { stdout: "pipe", stderr: "pipe" })
    if (claude_check.exitCode !== 0) {
      process.stdout.write(JSON.stringify(error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] }, meta()), null, 2) + "\n")
      return 1
    }
  }

  // -- rounds --

  const all_suggestions: StormSuggestion[] = []
  let total_ops = 0

  for (let round = 1; round <= rounds; round++) {
    if (rounds > 1) process.stderr.write(`\n[round ${round}/${rounds}]\n`)

    // reload each round
    const povs = load_active_povs(root)
    const worldview = load_worldview(root)

    const pov_block = povs.length > 0
      ? povs.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
      : "(no active points of view)"

    const worldview_block = worldview.length > 0
      ? worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
      : "(empty worldview)"

    const seed_block = seed_content
      ? `# Seed\n\n${seed_label !== "inline" ? `Source: ${seed_label}\n\n` : ""}${seed_content}`
      : "(no seed — brainstorm from the worldview itself)"

    const storm_prompt = `# Points of View

${pov_block}

---

# Current Worldview

${worldview_block}

---

# ${seed_block}

---

# Instructions

You are brainstorming — going OUTWARD from the current knowledge.
Your job is NOT to summarize or organize. Your job is to EXPAND.

Given the seed and current worldview, generate:
1. New worldview files that explore angles NOT currently covered
2. Suggestions for the user (new POVs to add, questions to investigate, sources to read)

Think divergently:
- What assumptions does the worldview make that could be challenged?
- What adjacent topics connect to this but aren't explored?
- What questions does the seed raise that the worldview can't answer?
- What opposing viewpoints are missing?
- What would a skeptic, an optimist, or a domain expert each add?

Respond with ONLY valid JSON (no markdown fences):
{
  "operations": [
    {"action": "create", "path": "relative/path.md", "content": "full markdown content"},
    {"action": "update", "path": "existing/path.md", "content": "full replacement content"}
  ],
  "reasoning": "what new directions you explored and why",
  "suggestions": [
    {"kind": "pov", "value": "security-skeptic", "reason": "the worldview assumes trust..."},
    {"kind": "question", "value": "What happens at 10x scale?", "reason": "..."},
    {"kind": "source", "value": "https://...", "reason": "this paper covers..."}
  ]
}

Paths are relative to worldview/. Use lowercase-kebab-case for file and directory names.
`

    // -- dry run --

    if (dry_run) {
      process.stdout.write(storm_prompt + "\n")
      return 0
    }

    // -- call claude --

    process.stderr.write(`storming: ${seed_label}...\n`)

    const raw = call_claude(storm_prompt, root)
    if (!raw) {
      return 1
    }

    let response = parse_json<StormResponse>(raw)
    if (!response) {
      process.stderr.write("warning: failed to parse response, retrying...\n")
      const retry = call_claude(storm_prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences.", root)
      if (!retry) { return 1 }
      response = parse_json<StormResponse>(retry)
      if (!response) {
        process.stdout.write(JSON.stringify(error({ parse: [{ code: "invalid_json", message: "could not get structured response from claude" }] }, meta()), null, 2) + "\n")
        return 1
      }
    }

    // normalize missing suggestions
    if (!response.suggestions) response.suggestions = []

    // -- stop early --

    if (response.operations.length === 0 && response.suggestions.length === 0) {
      process.stderr.write("nothing generated — storm exhausted\n")
      break
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

      apply_operations(root, response.operations)
      process.stderr.write(`applied ${response.operations.length} operation(s)\n`)
      total_ops += response.operations.length

      await regenerate_index(root)
    } else {
      process.stderr.write("no worldview changes this round\n")
    }

    // -- suggestions --

    if (response.suggestions.length > 0) {
      print_storm_suggestions(response.suggestions)
      all_suggestions.push(...response.suggestions)
    }
  }

  // -- output --

  const result_data = {
    seed: seed_label,
    rounds,
    operations: total_ops,
    suggestions: all_suggestions,
  }

  process.stdout.write(JSON.stringify(success(result_data, meta()), null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
