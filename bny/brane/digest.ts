#!/usr/bin/env bun
//
// bny brane digest — reprocess all sources through current POVs
//
// clears the worldview and re-eats every stashed source in chronological
// order. use this after adding/removing POVs to rebuild the brane
// through your current lenses.
//
// usage:
//   bny brane digest              # rebuild worldview from all sources
//   bny brane digest --dry-run    # show what would be re-eaten
//

import { success, error } from "../../src/lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_worldview, load_active_povs,
  call_claude, parse_json, apply_operations, worldview_dir,
  list_sources, load_stashed_source, clear_worldview,
  confirm_intake,
} from "../lib/brane.ts"
import type { EatResponse } from "../lib/brane.ts"

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
      process.stdout.write(`usage: bny brane digest [--dry-run] [--yes]

clears the worldview and re-eats all stashed sources through
current POVs. rebuilds the brane from scratch.

flags:
  --dry-run    list sources, don't re-eat
  --yes, -y    skip confirmation
`)
      return 0
    }
  }

  function meta() {
    return { path: "/bny/brane/digest", timestamp: new Date().toISOString(), duration_ms: 0 }
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

  const claude_check = Bun.spawnSync(["which", "claude"], { stdout: "pipe", stderr: "pipe" })
  if (claude_check.exitCode !== 0) {
    process.stdout.write(JSON.stringify(error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] }, meta()), null, 2) + "\n")
    return 1
  }

  // -- confirm --

  const total_size = sources.reduce((sum, s) => sum + s.size, 0)
  process.stderr.write(`\nwill clear worldview and re-eat ${sources.length} source(s) (${total_size} bytes)\n`)

  if (!auto_yes) {
    if (!confirm_intake()) {
      process.stderr.write("aborted\n")
      return 0
    }
  }

  // -- clear worldview --

  process.stderr.write(`clearing worldview...\n`)
  clear_worldview(root)

  // -- re-eat each source --

  let digested = 0
  let failed = 0

  for (const entry of sources) {
    const content = load_stashed_source(root, entry)
    if (!content) {
      process.stderr.write(`warning: missing stashed file for '${entry.label}', skipping\n`)
      failed++
      continue
    }

    process.stderr.write(`digesting: ${entry.label} (${entry.size} bytes)...\n`)

    // load current state (evolves each iteration)
    const povs = load_active_povs(root)
    const worldview = load_worldview(root)

    const pov_block = povs.length > 0
      ? povs.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
      : "(no active points of view)"

    const worldview_block = worldview.length > 0
      ? worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
      : "(empty — first ingestion)"

    const eat_prompt = `# Points of View

${pov_block}

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
Filter this information through all points of view above.
Not everything should be absorbed — only concepts that matter
through your active lenses. Be selective.

For each concept worth keeping:
- Decide if it belongs in an existing worldview file (update) or needs a new one (create)
- When updating, include the FULL new content for the file (not just the diff)
- Keep files focused on a single topic
- Use clear markdown with headers, not walls of text
- Organize into subdirectories by natural topic boundaries
- Files should render well on GitHub

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

    const raw = call_claude(eat_prompt, root)
    if (!raw) {
      process.stderr.write(`error: claude failed on '${entry.label}', skipping\n`)
      failed++
      continue
    }

    let response = parse_json<EatResponse>(raw)
    if (!response) {
      // retry once
      process.stderr.write("warning: failed to parse response, retrying...\n")
      const retry = call_claude(eat_prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences.", root)
      if (retry) response = parse_json<EatResponse>(retry)
      if (!response) {
        process.stderr.write(`error: could not parse response for '${entry.label}', skipping\n`)
        failed++
        continue
      }
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

  process.stderr.write("regenerating index.md...\n")

  const final_worldview = load_worldview(root)
  if (final_worldview.length > 0) {
    const index_prompt = `# Worldview Files

${final_worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")}

---

# Instructions

Generate a concise index.md that summarizes what this knowledge base contains.
Use markdown headers and bullet points. Link to files using relative paths.
Keep it scannable — someone should understand the full scope in 30 seconds.
Respond with ONLY the markdown content (no JSON, no fences).
`

    const index_raw = call_claude(index_prompt, root)
    if (index_raw) {
      let index_content = index_raw.trim()
      if (index_content.startsWith("```")) {
        index_content = index_content.replace(/^```(?:markdown)?\n?/, "").replace(/\n?```$/, "")
      }
      const { writeFileSync } = await import("node:fs")
      const { resolve } = await import("node:path")
      writeFileSync(resolve(worldview_dir(root), "index.md"), index_content.trim() + "\n")
      process.stderr.write("regenerated index.md\n")
    }
  }

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
