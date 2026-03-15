#!/usr/bin/env bun
//
// bny brane ask — query or review against the brane
//
// if the input is a file/URL, reviews it against the worldview.
// if the input is a plain string, answers from the worldview.
// the brane is NOT modified — this is read-only.
//
// usage:
//   bny brane ask "what is this project?"       # question
//   bny brane ask docs/competitor.md             # review a file
//   bny brane ask https://example.com/api-docs   # review a URL
//   bny brane ask --dry-run "question"           # print prompt
//

import { error } from "../lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_worldview, load_active_lenses,
  call_claude, list_sources,
} from "../lib/brane.ts"
import { create_spinner } from "../lib/spinner.ts"
import { which_check } from "../lib/spawn.ts"
import { read_input } from "../lib/input.ts"

export async function main(argv: string[]): Promise<number> {
  // -- read_input: handle --input <path> and stdin (-) --

  const { text: input_text, source: input_source, file_path, rest_argv } = read_input(argv)

  // -- parse args --

  let dry_run = false
  const input_parts: string[] = []

  for (const arg of rest_argv) {
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny brane ask [--dry-run] <question>

answers from the worldview. the brane is not modified.

input:
  <text...>              inline text (question)
  -                      read from stdin
  --input <path>         read from file (reviews file against worldview)
`)
      return 0
    } else {
      input_parts.push(arg)
    }
  }

  // -- resolve input --

  let input_content: string
  let input_label: string

  if (input_text !== null) {
    input_content = input_text
    input_label = input_source === "file" ? `Source: ${file_path}` : "Source: stdin"
  } else {
    const inline = input_parts.join(" ").trim()
    if (!inline) {
      const meta = { path: "/bny/brane/ask", timestamp: new Date().toISOString(), duration_ms: 0 }
      process.stdout.write(JSON.stringify(error({ input: [{ code: "required", message: "question or source is required" }] }, meta), null, 2) + "\n")
      return 1
    }
    input_content = inline
    input_label = "Question"
  }

  // -- setup --

  const root = find_root()
  ensure_brane(root)

  // -- load context --

  const lenses = load_active_lenses(root)
  const worldview = load_worldview(root)

  if (worldview.length === 0) {
    process.stderr.write("warning: worldview is empty — digest some information first\n")
  }

  // -- build prompt --

  const lens_block = lenses.length > 0
    ? lenses.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
    : "(no active lenses)"

  const worldview_block = worldview.length > 0
    ? worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
    : "(empty worldview)"

  // -- source provenance --

  const sources = list_sources(root)
  const provenance_block = sources.length > 0
    ? sources.map(s => `- ${s.label} (${s.eaten_at})`).join("\n")
    : "(no sources ingested yet)"

  // -- available files --

  const file_list = worldview.map(w => w.heading).join(", ")

  const ask_prompt = `# Active Lenses

${lens_block}

---

# Worldview

${worldview_block}

---

# Source Provenance

The worldview was built from these sources:

${provenance_block}

---

# ${input_label}

${input_content}

---

# Instructions

Answer based on your worldview. Synthesize across all active lenses.
If the input is a document, evaluate it — note alignment, conflicts, gaps,
and recommendations based on what you already know.
If the input is a question, answer it from what you know.
Be direct. No fluff.

IMPORTANT: End every response with a "Sources:" section that lists:
1. Which worldview files informed your answer (use the exact file paths: ${file_list})
2. Which original sources (from the provenance list) contributed to those worldview files, if you can trace the connection

Format:
Sources:
- worldview-file-path.md (from: original source label)
- another-file.md
`

  // -- dry run --

  if (dry_run) {
    process.stdout.write(ask_prompt + "\n")
    return 0
  }

  // -- check claude --

  if (!which_check("claude")) {
    const meta = { path: "/bny/brane/ask", timestamp: new Date().toISOString(), duration_ms: 0 }
    process.stdout.write(JSON.stringify(error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] }, meta), null, 2) + "\n")
    return 1
  }

  // -- call claude --

  const spin = create_spinner("asking brane")

  const raw = call_claude(ask_prompt, root)
  if (!raw) {
    spin.stop()
    return 1
  }
  spin.stop("🐰 asked brane")

  // -- output (plain text, not JSON) --

  process.stdout.write(raw + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
