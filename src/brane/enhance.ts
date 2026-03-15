#!/usr/bin/env bun
//
// bny brane enhance — convergent refinement of the worldview
//
// "enhance." looks at the existing worldview and sharpens it:
// fills gaps, removes redundancy, surfaces contradictions,
// deepens thin areas. goes INWARD — refines, not expands.
//
// usage:
//   bny brane enhance                        # enhance full worldview
//   bny brane enhance "api design"           # focus on a topic
//   bny brane enhance architecture.md        # focus on a specific file
//   bny brane enhance --rounds 3            # multi-round refinement
//   bny brane enhance --dry-run
//   bny brane enhance --yes
//

import { existsSync } from "node:fs"
import { resolve, relative } from "node:path"
import { success, error } from "../lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_worldview, load_active_lenses, worldview_dir,
  call_claude_structured, apply_operations,
  preview_operations, print_intake_diff, confirm_intake,
  regenerate_index,
} from "../lib/brane.ts"
import type { DigestResponse } from "../lib/brane.ts"
import { create_spinner } from "../lib/spinner.ts"
import { which_check } from "../lib/spawn.ts"
import { read_input } from "../lib/input.ts"

export async function main(argv: string[]): Promise<number> {
  // -- read_input: handle --input <path> and stdin (-) --

  const { text: input_text, rest_argv } = read_input(argv)

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
      process.stdout.write(`usage: bny brane enhance [--dry-run] [--yes] [--rounds N] [focus]

if no focus is given, enhances the full worldview.

flags:
  --dry-run      print prompt, don't call claude
  --yes, -y      skip confirmation, apply immediately
  --rounds N     multi-round refinement (default: 1)

input:
  <text...>              topic focus (inline text)
  -                      read from stdin
  --input <path>         read from file
`)
      return 0
    } else {
      input_parts.push(arg)
    }
  }

  const focus_input = input_text ?? (input_parts.join(" ").trim() || null)

  function meta() {
    return { path: "/bny/brane/enhance", timestamp: new Date().toISOString(), duration_ms: 0 }
  }

  // -- setup --

  const root = find_root()
  ensure_brane(root)

  // -- guard: worldview must not be empty --

  const initial_worldview = load_worldview(root)
  if (initial_worldview.length === 0) {
    process.stdout.write(JSON.stringify(error({ worldview: [{ code: "empty", message: "worldview is empty — digest some information first" }] }, meta()), null, 2) + "\n")
    return 1
  }

  // -- resolve focus --

  let focus_label: string | null = null

  if (focus_input) {
    focus_label = focus_input
  }

  // -- check claude --

  if (!dry_run) {
    if (!which_check("claude")) {
      process.stdout.write(JSON.stringify(error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] }, meta()), null, 2) + "\n")
      return 1
    }
  }

  // -- rounds --

  let total_ops = 0

  for (let round = 1; round <= rounds; round++) {
    if (rounds > 1) process.stderr.write(`\n[round ${round}/${rounds}]\n`)

    // reload each round
    const lenses = load_active_lenses(root)
    const worldview = load_worldview(root)

    const lens_block = lenses.length > 0
      ? lenses.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
      : "(no active lenses)"

    const worldview_block = worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")

    const focus_block = focus_label
      ? `\nFocus especially on: ${focus_label}\n`
      : ""

    const enhance_prompt = `# Active Lenses

${lens_block}

---

# Current Worldview

${worldview_block}

---

# Instructions

You are ENHANCING the worldview — going INWARD, not outward.
Make it sharper, more precise, more useful. Do NOT add new topics.

Review the current worldview and:
- Fill gaps: where is a topic mentioned but not developed?
- Remove redundancy: where do multiple files say the same thing?
- Surface contradictions: where do files disagree?
- Deepen: where are claims made without reasoning or evidence?
- Restructure: should any files be split, merged, or reorganized?
- Clarify: replace vague language with specific statements
- Every file MUST start with an H1 heading, then a one-sentence TL;DR on the next line (no blank line between heading and TL;DR). Example:
  # Topic Name
  One sentence summarizing this file's core idea.
${focus_block}
Your response will be validated against a JSON schema.

Return an object with:
- "operations": array of {action: "create"|"update", path: "relative/path.md", content: "full markdown content"}
- "reasoning": what was refined and why

Paths are relative to worldview/. Use lowercase-kebab-case for file and directory names.
If nothing needs refining, return empty operations with reasoning explaining why.
`

    // -- dry run --

    if (dry_run) {
      process.stdout.write(enhance_prompt + "\n")
      return 0
    }

    // -- call claude (structured output) --

    const DIGEST_SCHEMA = {
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
      },
      required: ["operations", "reasoning"],
    }

    const enhance_label = `enhancing${focus_label ? `: ${focus_label}` : ""}`
    const spin = create_spinner(enhance_label)

    const response = call_claude_structured<DigestResponse>(enhance_prompt, root, DIGEST_SCHEMA, "enhance")
    spin.stop(response ? `enhanced${focus_label ? `: ${focus_label}` : ""}` : undefined)

    if (!response) {
      process.stdout.write(JSON.stringify(error({ parse: [{ code: "invalid_json", message: "could not get structured response from claude" }] }, meta()), null, 2) + "\n")
      return 1
    }

    // -- stop early --

    if (response.operations.length === 0) {
      process.stderr.write("nothing to refine\n")
      break
    }

    // -- intake gate --

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
  }

  // -- output --

  const result_data = {
    focus: focus_label,
    rounds,
    operations: total_ops,
  }

  process.stdout.write(JSON.stringify(success(result_data, meta()), null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
