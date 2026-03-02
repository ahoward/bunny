#!/usr/bin/env bun
//
// bny brane eat — ingest information into the brane
//
// feeds a source (file, directory, or URL) through all active POVs.
// the LLM extracts concepts and updates the worldview.
//
// usage:
//   bny brane eat README.md              # ingest a file
//   bny brane eat docs/                  # ingest a directory (recursive)
//   bny brane eat https://example.com    # ingest a URL
//   bny brane eat --dry-run README.md    # print prompt, don't run
//

import { success, error } from "../../src/lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_source, load_worldview, load_active_povs,
  call_claude, parse_json, apply_operations, worldview_dir,
  stash_source, preview_operations, print_intake_diff, confirm_intake,
} from "../lib/brane.ts"
import type { EatResponse } from "../lib/brane.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  let dry_run = false
  let auto_yes = false
  let source: string | null = null

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--yes" || arg === "-y") {
      auto_yes = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny brane eat [--dry-run] [--yes] <source>

source can be a file path, directory, or URL.
directories are ingested recursively.

flags:
  --dry-run    print prompt, don't call claude
  --yes, -y    skip confirmation, apply immediately
`)
      return 0
    } else if (!arg.startsWith("-")) {
      source = arg
    }
  }

  if (!source) {
    process.stdout.write(JSON.stringify(error({ source: [{ code: "required", message: "source is required (file, directory, or URL)" }] }, meta()), null, 2) + "\n")
    return 1
  }

  function meta() {
    return { path: "/bny/brane/eat", timestamp: new Date().toISOString(), duration_ms: 0 }
  }

  // -- setup --

  const root = find_root()
  ensure_brane(root)

  // -- load source --

  const loaded = load_source(source, root)
  if (!loaded) {
    process.stdout.write(JSON.stringify(error({ source: [{ code: "not_found", message: `could not load source: ${source}` }] }, meta()), null, 2) + "\n")
    return 1
  }

  // -- stash source --

  const stashed = stash_source(root, loaded.label, loaded.content)
  process.stderr.write(`stashed: ${stashed.filename} (${stashed.size} bytes)\n`)

  // -- load context --

  const povs = load_active_povs(root)
  const worldview = load_worldview(root)

  // -- build prompt --

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

Source: ${loaded.label}

${loaded.content}

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

  // -- dry run --

  if (dry_run) {
    process.stdout.write(eat_prompt + "\n")
    return 0
  }

  // -- check claude --

  const claude_check = Bun.spawnSync(["which", "claude"], { stdout: "pipe", stderr: "pipe" })
  if (claude_check.exitCode !== 0) {
    process.stdout.write(JSON.stringify(error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] }, meta()), null, 2) + "\n")
    return 1
  }

  // -- call claude --

  process.stderr.write(`eating: ${loaded.label}...\n`)

  const raw = call_claude(eat_prompt, root)
  if (!raw) {
    return 1
  }

  let response = parse_json<EatResponse>(raw)
  if (!response) {
    // retry once
    process.stderr.write("warning: failed to parse response, retrying...\n")
    const retry = call_claude(eat_prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences.", root)
    if (!retry) { return 1 }
    response = parse_json<EatResponse>(retry)
    if (!response) {
      process.stdout.write(JSON.stringify(error({ parse: [{ code: "invalid_json", message: "could not get structured response from claude" }] }, meta()), null, 2) + "\n")
      return 1
    }
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

    // -- apply operations --

    apply_operations(root, response.operations)
    process.stderr.write(`applied ${response.operations.length} operation(s)\n`)

    // -- regenerate index --
    const updated_worldview = load_worldview(root)
    const index_prompt = `# Worldview Files

${updated_worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")}

---

# Instructions

Generate a concise index.md that summarizes what this knowledge base contains.
Use markdown headers and bullet points. Link to files using relative paths.
Keep it scannable — someone should understand the full scope in 30 seconds.
Respond with ONLY the markdown content (no JSON, no fences).
`

    const index_raw = call_claude(index_prompt, root)
    if (index_raw) {
      // strip any accidental fences
      let index_content = index_raw.trim()
      if (index_content.startsWith("```")) {
        index_content = index_content.replace(/^```(?:markdown)?\n?/, "").replace(/\n?```$/, "")
      }
      const { writeFileSync } = await import("node:fs")
      const { resolve } = await import("node:path")
      writeFileSync(resolve(worldview_dir(root), "index.md"), index_content.trim() + "\n")
      process.stderr.write("regenerated index.md\n")
    }
  } else {
    process.stderr.write("nothing absorbed\n")
  }

  // -- output --

  const result_data = {
    source: loaded.label,
    operations: response.operations.map(op => ({ action: op.action, path: op.path })),
    reasoning: response.reasoning,
  }

  process.stdout.write(JSON.stringify(success(result_data, meta()), null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
