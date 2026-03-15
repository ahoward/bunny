#!/usr/bin/env bun
//
// bny brane digest — ingest information into the brane
//
// feeds a source (file, directory, or URL) through all active lenses.
// the LLM extracts concepts and updates the worldview.
//
// usage:
//   bny brane digest README.md              # ingest a file
//   bny brane digest docs/                  # ingest a directory (recursive)
//   bny brane digest https://example.com    # ingest a URL
//   bny brane digest --dry-run README.md    # print prompt, don't run
//

import { success, error } from "../lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_source, load_worldview, load_active_lenses,
  call_claude_structured, apply_operations,
  stash_source, preview_operations, print_intake_diff, confirm_intake,
  regenerate_index,
} from "../lib/brane.ts"
import type { DigestResponse } from "../lib/brane.ts"
import { create_spinner } from "../lib/spinner.ts"
import { which_check } from "../lib/spawn.ts"
import { read_input } from "../lib/input.ts"

export async function main(argv: string[]): Promise<number> {
  // -- read_input: handle --input <path> and stdin (-) --

  const { text: input_text, source: input_source, file_path, rest_argv } = read_input(argv)

  // -- parse args --

  let dry_run = false
  let auto_yes = false
  let source: string | null = null

  for (const arg of rest_argv) {
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--yes" || arg === "-y") {
      auto_yes = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny digest [--dry-run] [--yes] <source>

source can be a file path, directory, or URL.
directories are ingested recursively.

flags:
  --dry-run    print prompt, don't call claude
  --yes, -y    skip confirmation, apply immediately

input:
  <path|url>             file, directory, or URL (positional)
  -                      read from stdin
  --input <path>         explicit file read
`)
      return 0
    } else if (!arg.startsWith("-")) {
      source = arg
    }
  }

  function meta() {
    return { path: "/bny/brane/digest", timestamp: new Date().toISOString(), duration_ms: 0 }
  }

  // -- setup --

  const root = find_root()
  ensure_brane(root)

  // -- resolve source --
  // digest is the one command where bare positional args are source paths.
  // --input and stdin provide content directly; positional uses load_source().

  let loaded: { content: string, label: string } | null = null

  if (input_text !== null) {
    const label = input_source === "file" ? (file_path ?? "file") : "stdin"
    loaded = { content: input_text, label }
  } else if (source) {
    loaded = load_source(source, root)
  }

  if (!loaded) {
    process.stdout.write(JSON.stringify(error({ source: [{ code: "required", message: "source is required (file, directory, URL, --input, or stdin)" }] }, meta()), null, 2) + "\n")
    return 1
  }

  // -- stash source --

  const stashed = stash_source(root, loaded.label, loaded.content)
  process.stderr.write(`stashed: ${stashed.filename} (${stashed.size} bytes)\n`)

  // -- load context --

  const lenses = load_active_lenses(root)
  const worldview = load_worldview(root)

  // -- build prompt --

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

Source: ${loaded.label}

${loaded.content}

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

Your response will be validated against a JSON schema.

Return an object with:
- "operations": array of {action: "create"|"update", path: "relative/path.md", content: "full markdown content"}
- "reasoning": brief explanation of what was absorbed and what was filtered out

Paths are relative to worldview/. Use lowercase-kebab-case for file and directory names.
If nothing is worth absorbing, return empty operations with reasoning explaining why.
`

  // -- dry run --

  if (dry_run) {
    process.stdout.write(digest_prompt + "\n")
    return 0
  }

  // -- check claude --

  if (!which_check("claude")) {
    process.stdout.write(JSON.stringify(error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] }, meta()), null, 2) + "\n")
    return 1
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

  const spin = create_spinner(`digesting: ${loaded.label}`)

  const response = call_claude_structured<DigestResponse>(digest_prompt, root, DIGEST_SCHEMA, "digest")
  spin.stop(response ? `digested: ${loaded.label}` : undefined)

  if (!response) {
    process.stdout.write(JSON.stringify(error({ parse: [{ code: "invalid_json", message: "could not get structured response from claude" }] }, meta()), null, 2) + "\n")
    return 1
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

    await regenerate_index(root)
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
