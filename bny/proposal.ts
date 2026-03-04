#!/usr/bin/env bun
//
// bny proposal — generate proposals from brane, accept into roadmap
//
// proposals bridge knowledge (brane) to execution (roadmap).
// each proposal lives as its own file in .bny/proposals/.
//
// usage:
//   bny proposal "auth system"                # generate proposal file
//   bny proposal --count 3 "backend"          # generate 3 proposals
//   bny proposal --dry-run "topic"            # print prompt, don't call claude
//   bny proposal --json "topic"               # JSON output
//   bny proposal accept <slug-or-path>        # accept into roadmap
//   bny proposal accept <slug> --dry-run      # print accept prompt
//

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs"
import { resolve, basename } from "node:path"
import { success, error } from "../src/lib/result.ts"
import { find_root } from "./lib/feature.ts"
import {
  ensure_brane, load_worldview, load_active_lenses,
  call_claude, parse_json, list_sources,
} from "./lib/brane.ts"
import { create_spinner } from "./lib/spinner.ts"

// -- types --

interface Proposal {
  title:          string
  summary:        string
  effort:         string
  rationale:      string
  worldview_refs: string[]
  sketch:         string[]
}

interface ProposeResponse {
  proposals: Proposal[]
  reasoning: string
}

interface RoadmapItem {
  priority:    string
  name:        string
  description: string
}

interface AcceptResponse {
  items:     RoadmapItem[]
  reasoning: string
}

// -- slug helpers (exported for testing) --

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

export function dedup_slug(slug: string, existing: string[]): string {
  if (!existing.includes(slug)) return slug
  let n = 2
  while (existing.includes(`${slug}-${n}`)) n++
  return `${slug}-${n}`
}

// -- paths --

function proposals_dir(root: string): string {
  return resolve(root, ".bny/proposals")
}

function ensure_proposals_dir(root: string): void {
  mkdirSync(proposals_dir(root), { recursive: true })
}

function list_existing_slugs(root: string): string[] {
  const dir = proposals_dir(root)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .map(f => f.replace(/\.md$/, ""))
}

function meta() {
  return { path: "/bny/proposal", timestamp: new Date().toISOString(), duration_ms: 0 }
}

// -- proposal file generation --

function format_proposal_file(proposal: Proposal, topic: string): string {
  const date = new Date().toISOString().split("T")[0]
  const refs = proposal.worldview_refs.length > 0
    ? proposal.worldview_refs.map(r => `- ${r}`).join("\n")
    : "- (none)"
  const sketch = proposal.sketch.length > 0
    ? proposal.sketch.map(s => `- ${s}`).join("\n")
    : "- (none)"

  return `# ${proposal.title}

Generated: ${date}
Topic: "${topic}"
Effort: ${proposal.effort}

## Rationale

${proposal.rationale}

## Worldview References

${refs}

## Summary

${proposal.summary}

## Implementation Sketch

${sketch}
`
}

// -- mode 1: generate proposals --

async function cmd_propose(argv: string[]): Promise<number> {
  let dry_run = false
  let json_mode = false
  let count = 1
  const input_parts: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--json") {
      json_mode = true
    } else if (arg === "--count" && i + 1 < argv.length) {
      const val = parseInt(argv[i + 1], 10)
      if (isNaN(val) || val < 1) {
        process.stderr.write("bny proposal: invalid --count value\n")
        return 1
      }
      count = val
      i++
    } else if (arg === "--help" || arg === "-h") {
      show_help()
      return 0
    } else {
      input_parts.push(arg)
    }
  }

  const topic = input_parts.join(" ").trim()
  if (!topic) {
    process.stdout.write(JSON.stringify(error({ input: [{ code: "required", message: "topic is required" }] }, meta()), null, 2) + "\n")
    return 1
  }

  // -- setup --

  const root = find_root()
  ensure_brane(root)
  ensure_proposals_dir(root)

  // -- load brane context --

  const lenses = load_active_lenses(root)
  const worldview = load_worldview(root)
  const sources = list_sources(root)

  const lens_block = lenses.length > 0
    ? lenses.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
    : "(no active lenses)"

  const worldview_block = worldview.length > 0
    ? worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
    : "(empty worldview)"

  const provenance_block = sources.length > 0
    ? sources.map(s => `- ${s.label} (${s.eaten_at})`).join("\n")
    : "(no sources ingested yet)"

  const worldview_files = worldview.map(w => w.heading)

  // -- build prompt (brane only, no code context) --

  const prompt = `# Active Lenses

${lens_block}

---

# Worldview

${worldview_block}

---

# Source Provenance

${provenance_block}

---

# Topic

"${topic}"

---

# Instructions

You are a proposal generator. Based on the worldview and topic above,
generate ${count} concrete proposal(s) for work that should be done.

Each proposal should:
- Have a clear, descriptive title (3-8 words, title case)
- Explain WHY this work matters (rationale grounded in the worldview)
- Reference specific worldview files that informed the proposal
- Include a high-level implementation sketch (3-7 bullet points)
- Estimate effort: S (hours), M (days), L (week+), XL (multi-week)

Think strategically — what would move this project forward most effectively?
Consider gaps, risks, opportunities, and natural next steps.

Available worldview files: ${worldview_files.join(", ") || "(none)"}

Respond with ONLY valid JSON (no markdown fences):
{
  "proposals": [
    {
      "title": "Auth System Overhaul",
      "summary": "2-3 sentence description.",
      "effort": "M",
      "rationale": "The worldview shows...",
      "worldview_refs": ["security-landscape.md", "api-architecture.md"],
      "sketch": ["design token format", "implement middleware", "add refresh flow"]
    }
  ],
  "reasoning": "why these proposals were chosen"
}
`

  // -- dry run --

  if (dry_run) {
    process.stdout.write(prompt + "\n")
    return 0
  }

  // -- check claude --

  const claude_check = Bun.spawnSync(["which", "claude"], { stdout: "pipe", stderr: "pipe" })
  if (claude_check.exitCode !== 0) {
    process.stdout.write(JSON.stringify(error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] }, meta()), null, 2) + "\n")
    return 1
  }

  // -- call claude --

  const spin = create_spinner("proposing")

  const raw = call_claude(prompt, root)
  if (!raw) {
    spin.stop()
    return 1
  }

  let response = parse_json<ProposeResponse>(raw)
  if (!response) {
    spin.stop()
    process.stderr.write("warning: failed to parse response, retrying...\n")
    const spin2 = create_spinner("retrying")
    const retry = call_claude(prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences.", root)
    spin2.stop()
    if (!retry) return 1
    response = parse_json<ProposeResponse>(retry)
    if (!response) {
      process.stdout.write(JSON.stringify(error({ parse: [{ code: "invalid_json", message: "could not get structured response from claude" }] }, meta()), null, 2) + "\n")
      return 1
    }
  } else {
    spin.stop("🐰 proposed")
  }

  if (!response.proposals || response.proposals.length === 0) {
    process.stderr.write("no proposals generated\n")
    return 1
  }

  // -- compute slugs and write files --

  const existing = list_existing_slugs(root)
  const created: { slug: string, title: string, path: string }[] = []

  for (const proposal of response.proposals) {
    const base_slug = slugify(proposal.title)
    const slug = dedup_slug(base_slug, [...existing, ...created.map(c => c.slug)])
    const file_path = resolve(proposals_dir(root), `${slug}.md`)
    const content = format_proposal_file(proposal, topic)
    writeFileSync(file_path, content)
    created.push({ slug, title: proposal.title, path: file_path })
    process.stderr.write(`  + .bny/proposals/${slug}.md — ${proposal.title}\n`)
  }

  process.stderr.write(`\n${created.length} proposal(s) created\n`)

  // -- output --

  if (json_mode) {
    const result = {
      proposals: created.map(c => ({ slug: c.slug, title: c.title })),
      reasoning: response.reasoning,
    }
    process.stdout.write(JSON.stringify(success(result, meta()), null, 2) + "\n")
  }

  return 0
}

// -- mode 2: accept proposal into roadmap --

async function cmd_accept(argv: string[]): Promise<number> {
  let dry_run = false
  let json_mode = false
  const input_parts: string[] = []

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--json") {
      json_mode = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny proposal accept <slug-or-path> [--dry-run] [--json]

accepts a proposal and populates the roadmap with decomposed work items.

args:
  <slug>    proposal slug (e.g. auth-system-overhaul)
  <path>    path to proposal file (e.g. .bny/proposals/auth-system-overhaul.md)

flags:
  --dry-run  print prompt, don't call claude
  --json     JSON output
`)
      return 0
    } else {
      input_parts.push(arg)
    }
  }

  const input = input_parts.join(" ").trim()
  if (!input) {
    const existing = list_existing_slugs(find_root())
    process.stderr.write("bny proposal accept: slug or path is required\n")
    if (existing.length > 0) {
      process.stderr.write(`\navailable proposals:\n`)
      for (const slug of existing) {
        process.stderr.write(`  ${slug}\n`)
      }
    } else {
      process.stderr.write("\nno proposals found — run 'bny proposal \"topic\"' first\n")
    }
    return 1
  }

  // -- resolve to file --

  const root = find_root()
  let proposal_path: string
  let slug: string

  if (input.endsWith(".md") || input.includes("/")) {
    // treat as path
    proposal_path = resolve(root, input)
    slug = basename(proposal_path, ".md")
  } else {
    // treat as slug
    slug = input
    proposal_path = resolve(proposals_dir(root), `${slug}.md`)
  }

  if (!existsSync(proposal_path)) {
    const existing = list_existing_slugs(root)
    process.stderr.write(`bny proposal accept: not found: ${slug}\n`)
    if (existing.length > 0) {
      process.stderr.write(`\navailable proposals:\n`)
      for (const s of existing) {
        process.stderr.write(`  ${s}\n`)
      }
    }
    return 1
  }

  // -- setup --

  ensure_brane(root)

  // -- load proposal --

  const proposal_content = readFileSync(proposal_path, "utf-8")

  // -- load brane context --

  const lenses = load_active_lenses(root)
  const worldview = load_worldview(root)

  const lens_block = lenses.length > 0
    ? lenses.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
    : "(no active lenses)"

  const worldview_block = worldview.length > 0
    ? worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
    : "(empty worldview)"

  // -- load code context from map index (non-fatal) --

  let code_context = ""
  try {
    const { open_index, focus_query, format_focus_markdown } = await import("./lib/map_index.ts")
    // extract title from proposal for query
    const title_match = proposal_content.match(/^# (.+)$/m)
    const query_text = title_match ? title_match[1] : slug.replace(/-/g, " ")
    const db = open_index(root)
    const focus = focus_query(db, query_text, 10)
    db.close()
    if (focus.files.length > 0) {
      code_context = format_focus_markdown(focus)
    }
  } catch {
    // map index not available — continue without code context
  }

  const code_block = code_context
    ? `# Code Context\n\n${code_context}`
    : "(no code index available — run 'bny map' to build one)"

  // -- build prompt --

  const prompt = `# Active Lenses

${lens_block}

---

# Worldview

${worldview_block}

---

# Proposal

${proposal_content}

---

# ${code_block}

---

# Instructions

You are decomposing a proposal into roadmap items.

Given the proposal above and the code context, break this down into
concrete, ordered work items for the roadmap.

For each item:
- Assign priority: P0 (critical/blocking), P1 (important), P2 (nice-to-have), P3 (backlog)
- Give a short name (3-6 words)
- Write a brief description of what to do

Priority rubric:
- P0: Must be done first. Other items depend on it. Foundational.
- P1: Important for the proposal to succeed. Core functionality.
- P2: Enhances the result. Could be deferred.
- P3: Stretch goal. Nice to have but not essential.

Order items by dependency, not just priority.

Respond with ONLY valid JSON (no markdown fences):
{
  "items": [
    {
      "priority": "P0",
      "name": "token format design",
      "description": "define JWT claims and signing strategy"
    }
  ],
  "reasoning": "why this decomposition and ordering"
}
`

  // -- dry run --

  if (dry_run) {
    process.stdout.write(prompt + "\n")
    return 0
  }

  // -- check claude --

  const claude_check = Bun.spawnSync(["which", "claude"], { stdout: "pipe", stderr: "pipe" })
  if (claude_check.exitCode !== 0) {
    process.stdout.write(JSON.stringify(error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] }, meta()), null, 2) + "\n")
    return 1
  }

  // -- call claude --

  const spin = create_spinner("accepting proposal")

  const raw = call_claude(prompt, root)
  if (!raw) {
    spin.stop()
    return 1
  }

  let response = parse_json<AcceptResponse>(raw)
  if (!response) {
    spin.stop()
    process.stderr.write("warning: failed to parse response, retrying...\n")
    const spin2 = create_spinner("retrying")
    const retry = call_claude(prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences.", root)
    spin2.stop()
    if (!retry) return 1
    response = parse_json<AcceptResponse>(retry)
    if (!response) {
      process.stdout.write(JSON.stringify(error({ parse: [{ code: "invalid_json", message: "could not get structured response from claude" }] }, meta()), null, 2) + "\n")
      return 1
    }
  } else {
    spin.stop("🐰 accepted proposal")
  }

  if (!response.items || response.items.length === 0) {
    process.stderr.write("no roadmap items generated\n")
    return 1
  }

  // -- update roadmap --

  const roadmap_path = resolve(root, ".bny/roadmap.md")
  let roadmap = existsSync(roadmap_path) ? readFileSync(roadmap_path, "utf-8") : "# Roadmap\n\n## Next\n\n## Completed\n"

  // build new ## Next section
  const new_items = response.items.map(item =>
    `- [ ] ${item.priority}: ${item.name} — ${item.description} (${slug})`
  ).join("\n")

  const items_block = `\nSource: [${slug}](proposals/${slug}.md)\n${new_items}`

  // append to ## Next section instead of replacing it
  const next_idx = roadmap.indexOf("## Next")
  if (next_idx >= 0) {
    // find the end of the ## Next section (next ## heading or EOF)
    const after_next = roadmap.indexOf("\n## ", next_idx + 7)
    const insert_at = after_next >= 0 ? after_next : roadmap.length
    const before = roadmap.slice(0, insert_at).trimEnd()
    const after = after_next >= 0 ? roadmap.slice(after_next) : ""
    const new_roadmap = before + "\n\n" + items_block + "\n" + after
    writeFileSync(roadmap_path, new_roadmap)
  } else {
    // no ## Next section — create one
    const new_roadmap = roadmap.trimEnd() + "\n\n## Next\n" + items_block + "\n"
    writeFileSync(roadmap_path, new_roadmap)
  }

  // -- output --

  process.stderr.write(`\nupdated .bny/roadmap.md with ${response.items.length} item(s) from ${slug}\n`)

  for (const item of response.items) {
    process.stderr.write(`  ${item.priority}: ${item.name} — ${item.description}\n`)
  }

  if (json_mode) {
    const result = {
      slug,
      items: response.items,
      reasoning: response.reasoning,
    }
    process.stdout.write(JSON.stringify(success(result, meta()), null, 2) + "\n")
  }

  return 0
}

// -- help --

function show_help(): void {
  process.stdout.write(`usage: bny proposal [--dry-run] [--json] [--count N] <topic>
       bny proposal accept <slug-or-path> [--dry-run] [--json]

generate proposals from the brane, accept into the roadmap.

commands:
  bny proposal "topic"       generate proposal(s) as .bny/proposals/<slug>.md
  bny proposal accept <slug> accept a proposal into the roadmap

flags:
  --count N    generate N proposals (default: 1)
  --dry-run    print prompt, don't call claude
  --json       JSON output with Result envelope
`)
}

// -- main --

export async function main(argv: string[]): Promise<number> {
  // detect accept subcommand
  if (argv[0] === "accept") {
    return cmd_accept(argv.slice(1))
  }

  if (argv[0] === "--help" || argv[0] === "-h") {
    show_help()
    return 0
  }

  return cmd_propose(argv)
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
