#!/usr/bin/env bun
//
// bny brane storm — divergent brainstorming against the brane
//
// "brane storming." takes a seed (text, file, or URL) and generates
// new ideas, questions, lens suggestions, and source recommendations.
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

import { success, error } from "../lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_worldview, load_active_lenses,
  call_claude_structured, apply_operations,
  preview_operations, print_intake_diff, confirm_intake,
  regenerate_index, print_storm_suggestions,
} from "../lib/brane.ts"
import { read_input } from "../lib/input.ts"
import type { StormResponse, StormSuggestion } from "../lib/brane.ts"
import { create_spinner } from "../lib/spinner.ts"
import { which_check } from "../lib/spawn.ts"

export async function main(argv: string[]): Promise<number> {
  // -- read_input: handle --input <path> and stdin (-) --

  const { text: input_text, source: input_source, file_path, rest_argv } = read_input(argv)

  // -- parse args --

  let dry_run = false
  let auto_yes = false
  let rounds = 1
  const input_parts: string[] = []

  for (let i = 0; i < rest_argv.length; i++) {
    const arg = rest_argv[i]
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--yes" || arg === "-y") {
      auto_yes = true
    } else if (arg === "--rounds" && i + 1 < rest_argv.length) {
      rounds = parseInt(rest_argv[i + 1], 10)
      if (isNaN(rounds) || rounds < 1) rounds = 1
      i++
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny brane storm [--dry-run] [--yes] [--rounds N] [seed]

if no seed is given, storms on the current worldview.

flags:
  --dry-run      print prompt, don't call claude
  --yes, -y      skip confirmation, apply immediately
  --rounds N     multi-round brainstorming (default: 1)

input:
  <text...>              inline text
  -                      read from stdin
  --input <path>         read from file
`)
      return 0
    } else {
      input_parts.push(arg)
    }
  }

  function meta() {
    return { path: "/bny/brane/storm", timestamp: new Date().toISOString(), duration_ms: 0 }
  }

  // -- setup --

  const root = find_root()
  ensure_brane(root)

  // -- resolve seed --

  let seed_content: string | null = null
  let seed_label = "(no seed — storming on worldview)"

  if (input_text !== null) {
    seed_content = input_text
    seed_label = input_source === "file" ? (file_path ?? "file") : "stdin"
  } else {
    const seed_input = input_parts.join(" ").trim() || null
    if (seed_input) {
      seed_content = seed_input
      seed_label = "inline"
    }
  }

  // -- check claude --

  if (!dry_run) {
    if (!which_check("claude")) {
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
    const lenses = load_active_lenses(root)
    const worldview = load_worldview(root)

    const lens_block = lenses.length > 0
      ? lenses.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
      : "(no active lenses)"

    const worldview_block = worldview.length > 0
      ? worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
      : "(empty worldview)"

    const seed_block = seed_content
      ? `# Seed\n\n${seed_label !== "inline" ? `Source: ${seed_label}\n\n` : ""}${seed_content}`
      : "(no seed — brainstorm from the worldview itself)"

    const storm_prompt = `# Active Lenses

${lens_block}

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
2. Suggestions for the user (new lenses to add, questions to investigate, sources to read)

Think divergently:
- What assumptions does the worldview make that could be challenged?
- What adjacent topics connect to this but aren't explored?
- What questions does the seed raise that the worldview can't answer?
- What opposing viewpoints are missing?
- What would a skeptic, an optimist, or a domain expert each add?

Every file MUST start with an H1 heading, then a one-sentence TL;DR on the next line (no blank line between heading and TL;DR). Example:
  # Topic Name
  One sentence summarizing this file's core idea.

Your response will be validated against a JSON schema.

Return an object with:
- "operations": array of {action: "create"|"update", path: "relative/path.md", content: "full markdown content"}
- "reasoning": what new directions you explored and why
- "suggestions": array of {kind: "lens"|"question"|"source", value: "...", reason: "..."}

Paths are relative to worldview/. Use lowercase-kebab-case for file and directory names.
`

    // -- dry run --

    if (dry_run) {
      process.stdout.write(storm_prompt + "\n")
      return 0
    }

    // -- call claude (structured output) --

    const STORM_SCHEMA = {
      type: "object",
      properties: {
        operations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action:  { type: "string", enum: ["create", "update"] },
              path:    { type: "string" },
              content: { type: "string" },
            },
            required: ["action", "path", "content"],
          },
        },
        reasoning: { type: "string" },
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind:   { type: "string", enum: ["lens", "question", "source"] },
              value:  { type: "string" },
              reason: { type: "string" },
            },
            required: ["kind", "value", "reason"],
          },
        },
      },
      required: ["operations", "reasoning", "suggestions"],
    }

    const spin = create_spinner(`storming: ${seed_label}`)

    const response = call_claude_structured<StormResponse>(storm_prompt, root, STORM_SCHEMA, "storm")
    spin.stop(response ? `stormed: ${seed_label}` : undefined)

    if (!response) {
      process.stdout.write(JSON.stringify(error({ parse: [{ code: "invalid_json", message: "could not get structured response from claude" }] }, meta()), null, 2) + "\n")
      return 1
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
