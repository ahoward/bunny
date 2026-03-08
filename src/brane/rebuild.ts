#!/usr/bin/env bun
//
// bny brane rebuild — rebuild worldview from all sources
//
// clears the worldview and re-digests every stashed source in chronological
// order. use this after adding/removing lenses to rebuild the brane
// through your current lenses.
//
// usage:
//   bny brane rebuild              # rebuild worldview from all sources
//   bny brane rebuild --dry-run   # show what would be re-digested
//

import { success, error } from "../lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_worldview, load_active_lenses,
  call_claude, parse_json, apply_operations,
  list_sources, load_stashed_source, clear_worldview,
  confirm_intake, regenerate_index,
} from "../lib/brane.ts"
import type { DigestResponse } from "../lib/brane.ts"
import { create_spinner } from "../lib/spinner.ts"
import { which_check } from "../lib/spawn.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  let dry_run = false
  let auto_yes = false

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--yes" || arg === "-y") {
      auto_yes = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny brane rebuild [--dry-run] [--yes]

clears the worldview and re-digests all stashed sources through
current lenses. rebuilds the brane from scratch.

flags:
  --dry-run    list sources, don't re-digest
  --yes, -y    skip confirmation
`)
      return 0
    }
  }

  function meta() {
    return { path: "/bny/brane/rebuild", timestamp: new Date().toISOString(), duration_ms: 0 }
  }

  // -- setup --

  const root = find_root()
  ensure_brane(root)

  // -- load sources --

  const sources = list_sources(root)

  if (sources.length === 0) {
    process.stderr.write("nothing to digest — no stashed sources\n")
    process.stdout.write(JSON.stringify(success({ digested: 0 }, meta()), null, 2) + "\n")
    return 0
  }

  // -- dry run --

  if (dry_run) {
    process.stdout.write(`would digest ${sources.length} source(s):\n`)
    for (const entry of sources) {
      process.stdout.write(`  ${entry.eaten_at}  ${entry.label}  (${entry.size} bytes)\n`)
    }
    return 0
  }

  // -- check claude --

  if (!which_check("claude")) {
    process.stdout.write(JSON.stringify(error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] }, meta()), null, 2) + "\n")
    return 1
  }

  // -- confirm --

  const total_size = sources.reduce((sum, s) => sum + s.size, 0)
  process.stderr.write(`\nwill clear worldview and re-digest ${sources.length} source(s) (${total_size} bytes)\n`)

  if (!auto_yes) {
    if (!confirm_intake()) {
      process.stderr.write("aborted\n")
      return 0
    }
  }

  // -- clear worldview --

  process.stderr.write(`clearing worldview...\n`)
  clear_worldview(root)

  // -- re-digest each source --

  let digested = 0
  let failed = 0

  for (const entry of sources) {
    const content = load_stashed_source(root, entry)
    if (!content) {
      process.stderr.write(`warning: missing stashed file for '${entry.label}', skipping\n`)
      failed++
      continue
    }

    const spin = create_spinner(`rebuilding: ${entry.label} (${entry.size} bytes)`)

    // load current state (evolves each iteration)
    const lenses = load_active_lenses(root)
    const worldview = load_worldview(root)

    const lens_block = lenses.length > 0
      ? lenses.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
      : "(no active lenses)"

    const worldview_block = worldview.length > 0
      ? worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
      : "(empty — first ingestion)"

    const digest_prompt = `# Active Lenses

${lens_block}

---

# Current Worldview

${worldview_block}

---

# New Information

Source: ${entry.label}

${content}

---

# Instructions

You are maintaining a knowledge base as markdown files.
Filter this information through all active lenses above.
Not everything should be absorbed — only concepts that matter
through your active lenses. Be selective.

For each concept worth keeping:
- Decide if it belongs in an existing worldview file (update) or needs a new one (create)
- When updating, include the FULL new content for the file (not just the diff)
- Keep files focused on a single topic
- Use clear markdown with headers, not walls of text
- Organize into subdirectories by natural topic boundaries
- Files should render well on GitHub
- Every file MUST start with an H1 heading, then a one-sentence TL;DR on the next line (no blank line between heading and TL;DR). Example:
  # Topic Name
  One sentence summarizing this file's core idea.

Respond with ONLY valid JSON (no markdown fences):
{
  "operations": [
    {"action": "create", "path": "relative/path.md", "content": "full markdown content"},
    {"action": "update", "path": "existing/path.md", "content": "full replacement content"}
  ],
  "reasoning": "brief explanation of what was absorbed and what was filtered out"
}

Paths are relative to worldview/. Use lowercase-kebab-case for file and directory names.
If nothing is worth absorbing, return empty operations with reasoning explaining why.
`

    const raw = call_claude(digest_prompt, root)
    if (!raw) {
      spin.stop()
      process.stderr.write(`error: claude failed on '${entry.label}', skipping\n`)
      failed++
      continue
    }

    let response = parse_json<DigestResponse>(raw)
    if (!response) {
      spin.stop()
      process.stderr.write("warning: failed to parse response, retrying...\n")
      const spin2 = create_spinner(`retrying: ${entry.label}`)
      const retry = call_claude(digest_prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences.", root)
      spin2.stop()
      if (retry) response = parse_json<DigestResponse>(retry)
      if (!response) {
        process.stderr.write(`error: could not parse response for '${entry.label}', skipping\n`)
        failed++
        continue
      }
    } else {
      spin.stop(`🐰 digested: ${entry.label}`)
    }

    if (response.operations.length > 0) {
      apply_operations(root, response.operations)
      process.stderr.write(`  applied ${response.operations.length} operation(s)\n`)
    } else {
      process.stderr.write(`  nothing absorbed\n`)
    }

    process.stderr.write(`  reasoning: ${response.reasoning}\n`)
    digested++
  }

  // -- regenerate index --

  await regenerate_index(root)

  // -- output --

  const result_data = {
    digested,
    failed,
    total: sources.length,
  }

  process.stdout.write(JSON.stringify(success(result_data, meta()), null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
