#!/usr/bin/env bun
//
// bny init — scaffold a project for bny
//
// drops in as a guest: marker-delimited blocks in existing files,
// creates only what's missing, fully reversible with `bny uninit`.
//
// usage:
//   bny init              # scaffold everything
//   bny init --force      # overwrite existing files
//   bny init --minimal    # just bny/ state, no dev scripts
//

import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync, lstatSync, readlinkSync, unlinkSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { spawn_sync } from "./lib/spawn.ts"
import { detect_project_type } from "./lib/project.ts"
import type { ProjectType } from "./lib/project.ts"

// -- marker block operations --

type PatchResult = "created" | "updated" | "skipped"

function patch_file(
  abs_path: string,
  content: string,
  start_marker: string,
  end_marker: string,
): PatchResult {
  const dir = dirname(abs_path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const block = `${start_marker}\n${content}\n${end_marker}\n`

  if (!existsSync(abs_path)) {
    writeFileSync(abs_path, block)
    return "created"
  }

  const existing = readFileSync(abs_path, "utf-8")
  const start_idx = existing.indexOf(start_marker)
  const end_idx = existing.indexOf(end_marker)

  if (start_idx === -1) {
    // no marker found — append block
    const sep = existing.length > 0 && !existing.endsWith("\n") ? "\n\n" : existing.length > 0 ? "\n" : ""
    writeFileSync(abs_path, existing + sep + block)
    return "updated"
  }

  if (start_idx !== -1 && end_idx !== -1 && end_idx > start_idx) {
    // marker found — check if content is same
    const old_block = existing.slice(start_idx, end_idx + end_marker.length)
    const new_block = `${start_marker}\n${content}\n${end_marker}`
    if (old_block === new_block) return "skipped"

    // replace between markers
    const before = existing.slice(0, start_idx)
    const after = existing.slice(end_idx + end_marker.length)
    writeFileSync(abs_path, before + new_block + after)
    return "updated"
  }

  // malformed markers — append fresh block
  const sep = existing.endsWith("\n") ? "\n" : "\n\n"
  writeFileSync(abs_path, existing + sep + block)
  return "updated"
}

function patch_agent_file(root: string, rel_path: string): PatchResult | "converted" {
  const abs_path = resolve(root, rel_path)

  // handle symlink → real file conversion
  if (existsSync(abs_path)) {
    try {
      const stat = lstatSync(abs_path)
      if (stat.isSymbolicLink()) {
        const target = readlinkSync(abs_path)
        let content = ""
        try {
          content = readFileSync(abs_path, "utf-8")
        } catch {
          // broken symlink — start fresh
        }
        unlinkSync(abs_path)
        // filter out any existing bny marker block from the symlink target content
        const cleaned = strip_marker_content(content, "<!-- bny:start -->", "<!-- bny:end -->")
        if (cleaned.trim().length > 0) {
          writeFileSync(abs_path, cleaned)
        }
        // now patch the marker block in
        patch_file(abs_path, AGENT_BLOCK, "<!-- bny:start -->", "<!-- bny:end -->")
        return "converted"
      }
    } catch {
      // not a symlink, fall through
    }
  }

  return patch_file(
    abs_path,
    AGENT_BLOCK,
    "<!-- bny:start -->",
    "<!-- bny:end -->",
  )
}

function strip_marker_content(text: string, start_marker: string, end_marker: string): string {
  const start_idx = text.indexOf(start_marker)
  const end_idx = text.indexOf(end_marker)
  if (start_idx === -1 || end_idx === -1 || end_idx <= start_idx) return text
  const before = text.slice(0, start_idx)
  const after = text.slice(end_idx + end_marker.length)
  return (before + after).replace(/\n{3,}/g, "\n\n").trim() + "\n"
}

// -- main --

export async function main(argv: string[]): Promise<number> {
  let force = false
  let minimal = false

  for (const arg of argv) {
    if (arg === "--force" || arg === "-f") force = true
    else if (arg === "--minimal") minimal = true
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny init [--force] [--minimal]

scaffolds a project for bny (guest, not landlord).

creates:
  bny/              project state (constitution, guardrails, roadmap, decisions)
  bny/brane/        knowledge base (worldview, index)
  dev/               development scripts (setup, test, health, pre_flight, post_flight)
  .githooks/         git hooks (pre-commit, pre-push)

patches (marker-delimited blocks):
  CLAUDE.md          bny usage instructions
  GEMINI.md          bny usage instructions
  AGENTS.md          bny usage instructions
  .gitignore         bny ignore patterns
  .githooks/*        bny hook lines

flags:
  --force, -f     overwrite existing files (state + dev scripts only)
  --minimal       just bny/ state, no dev scripts or hooks
`)
      return 0
    }
  }

  const root = process.cwd()

  // -- check git repo --

  if (!existsSync(resolve(root, ".git"))) {
    const r = spawn_sync({ cmd: ["git", "init"], cwd: root, label: "git init" })
    if (!r.ok) {
      process.stderr.write(`error: git init failed: ${r.detail}\n`)
      return 1
    }
    process.stderr.write("initialized git repo\n")
  }

  // -- scaffold --

  let created = 0
  let updated = 0
  let skipped = 0
  let converted = 0

  function tally(result: PatchResult | "converted", label: string): void {
    if (result === "created")   { created++;   process.stderr.write(`  create   ${label}\n`) }
    if (result === "updated")   { updated++;   process.stderr.write(`  update   ${label}\n`) }
    if (result === "skipped")   { skipped++ }
    if (result === "converted") { converted++; process.stderr.write(`  convert  ${label}\n`) }
  }

  function write_state(rel_path: string, content: string): void {
    const abs = resolve(root, rel_path)
    if (existsSync(abs) && !force) {
      skipped++
      return
    }
    const dir = dirname(abs)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(abs, content)
    process.stderr.write(`  create   ${rel_path}\n`)
    created++
  }

  function write_script(rel_path: string, content: string): void {
    const abs = resolve(root, rel_path)
    if (existsSync(abs) && !force) {
      skipped++
      return
    }
    const dir = dirname(abs)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(abs, content)
    chmodSync(abs, 0o755)
    process.stderr.write(`  create   ${rel_path}\n`)
    created++
  }

  process.stderr.write(`[bny init] ${force ? "(force) " : ""}${minimal ? "(minimal) " : ""}\n\n`)

  // -- bny/ state (skip-if-exists, same as before) --

  write_state("bny/constitution.md", CONSTITUTION)
  write_state("bny/guardrails.json", GUARDRAILS)
  write_state("bny/roadmap.md", ROADMAP)
  write_state("bny/decisions.md", DECISIONS)
  write_state("bny/todos.md", TODOS)

  // -- bny/brane/ (worldview/ created on first digest) --

  if (!minimal) {
    // -- detect project type --

    const project = detect_project_type(root)
    process.stderr.write(`  detected ${project.type} project\n`)

    // -- dev/ scripts (skip-if-exists, with bny-generated marker) --

    write_script("dev/setup", dev_setup(project))
    write_script("dev/test", dev_test(project))
    write_script("dev/health", DEV_HEALTH)
    write_script("dev/pre_flight", dev_pre_flight(project))
    write_script("dev/post_flight", dev_post_flight(project))

    // -- .githooks/ (marker blocks — append to existing or create) --

    tally(
      patch_file(resolve(root, ".githooks/pre-commit"), HOOK_PRE_COMMIT_CONTENT, "# bny:start", "# bny:end"),
      ".githooks/pre-commit",
    )
    chmodSync(resolve(root, ".githooks/pre-commit"), 0o755)

    tally(
      patch_file(resolve(root, ".githooks/pre-push"), HOOK_PRE_PUSH_CONTENT, "# bny:start", "# bny:end"),
      ".githooks/pre-push",
    )
    chmodSync(resolve(root, ".githooks/pre-push"), 0o755)

    // ensure shebang on newly created hook files
    for (const hook of [".githooks/pre-commit", ".githooks/pre-push"]) {
      const abs = resolve(root, hook)
      const content = readFileSync(abs, "utf-8")
      if (!content.startsWith("#!/")) {
        writeFileSync(abs, `#!/usr/bin/env bash\nset -e\n\n${content}`)
      }
    }

    // -- .gitignore (marker block) --

    tally(
      patch_file(resolve(root, ".gitignore"), GITIGNORE_CONTENT, "# bny:start", "# bny:end"),
      ".gitignore",
    )

    // -- agent files (the big three — always create or patch) --

    tally(patch_agent_file(root, "CLAUDE.md"), "CLAUDE.md")
    tally(patch_agent_file(root, "GEMINI.md"), "GEMINI.md")
    tally(patch_agent_file(root, "AGENTS.md"), "AGENTS.md")

    // -- optional agent files (only if parent dir exists) --

    const optional_agents: [string, string][] = [
      [".github/agents",   ".github/agents/copilot-instructions.md"],
      [".cursor/rules",    ".cursor/rules/bny.mdc"],
      [".windsurf/rules",  ".windsurf/rules/bny.md"],
      [".kilocode/rules",  ".kilocode/rules/bny.md"],
      [".augment/rules",   ".augment/rules/bny.md"],
      [".roo/rules",       ".roo/rules/bny.md"],
    ]

    for (const [dir, file] of optional_agents) {
      if (existsSync(resolve(root, dir))) {
        tally(patch_agent_file(root, file), file)
      }
    }

    // -- configure git hooks path --

    const hooks_check = spawn_sync({ cmd: ["git", "config", "core.hooksPath"], label: "git config" })
    if (hooks_check.stdout !== ".githooks") {
      spawn_sync({ cmd: ["git", "config", "core.hooksPath", ".githooks"], label: "git config" })
      process.stderr.write(`  config   git core.hooksPath → .githooks\n`)
    }
  }

  // -- summary --

  const parts = []
  if (created > 0) parts.push(`${created} created`)
  if (updated > 0) parts.push(`${updated} updated`)
  if (converted > 0) parts.push(`${converted} converted`)
  if (skipped > 0) parts.push(`${skipped} skipped`)
  process.stderr.write(`\n  ${parts.join(", ")}\n`)
  if (skipped > 0 && !force) {
    process.stderr.write(`  use --force to overwrite state/dev files\n`)
  }
  process.stderr.write(`\n  next: edit bny/roadmap.md, then run 'bny ipm' to plan\n`)

  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))

// -- templates --

const AGENT_BLOCK = `## bny

you have \`bny\` available — a persistent knowledge graph and build factory.

commands:
- \`bny digest <source>\` — ingest file, URL, or directory into the knowledge graph
- \`bny brane ask "question"\` — query accumulated knowledge
- \`bny brane tldr\` — instant outline of what the graph knows
- \`bny build "description"\` — full pipeline: specify → plan → tasks → review → implement → ruminate
- \`bny spike "description"\` — exploratory build (no review)
- \`bny proposal "topic"\` — generate proposals from the graph

workflow:
- tests are written by the antagonist agent — do NOT modify test files during implementation
- run \`./dev/test\` after code changes — all tests must pass
- run \`./dev/post_flight\` before commits
- read \`bny/guardrails.json\` for project constraints
- append to \`bny/decisions.md\` after completing work

knowledge graph:
- read \`bny/brane/worldview/README.md\` for accumulated project knowledge
- the worldview README is auto-regenerated after every brane operation

state lives in \`bny/\`. do not modify state files directly.`

const HOOK_PRE_COMMIT_CONTENT = `./dev/post_flight`

const HOOK_PRE_PUSH_CONTENT = `./dev/test`

const GITIGNORE_CONTENT = `bny/bny.pid
bny/children/`

const CONSTITUTION = `# Constitution

## Core Principles

### I. POD Only (Plain Old Data)
All data structures are Plain Old Data. No classes for data containers.
Types are interfaces or type aliases. Functions transform POD to POD.

### II. Antagonistic Testing
Tests are specifications. Claude designs, Gemini challenges, then implement.
Tests MUST exist before implementation. Tests lock after review.

### III. Unix-Clean
null over undefined. Exit codes matter. Streams and pipes where appropriate.

### IV. Simplicity (YAGNI)
Start simple. Three similar lines > one premature abstraction.
Complexity MUST be justified.

### V. The Strange Loop
The knowledge graph accumulates understanding. Each iteration enriches
the next. Guardrails bound each iteration. The loop is powerful because
it is constrained.

## Naming

| Thing | Style | Example |
|-------|-------|---------|
| Constants | SCREAMING_SNAKE | MAX_SIZE |
| Types | PascalCase | FileRecord |
| Variables/functions | snake_case | file_path |

## Workflow

1. Design interface
2. Design tests (Claude)
3. Review tests (Gemini)
4. Implement
5. Loop until green
6. If stuck — human checkpoint

Version: 1.0.0
`

const GUARDRAILS = `{
  "version": "1.0.0",

  "protected_files": [
    "bny/guardrails.json",
    "bny/decisions.md"
  ],

  "blast_radius": {
    "max_files_per_pr": 20,
    "max_lines_changed_per_pr": 500,
    "max_new_dependencies": 0,
    "new_dependency_requires": "human_approval"
  },

  "forbidden_actions": [
    "force_push_main",
    "skip_tests"
  ],

  "require_human_approval": [
    "new_runtime_dependency",
    "schema_migration",
    "constitution_amendment"
  ]
}
`

const ROADMAP = `# Roadmap

## Next

<!-- add items: - [ ] feature-name — description -->

## Completed

<!-- completed items move here: - [x] feature-name — description -->
`

const DECISIONS = `# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
`

const TODOS = ``

// -- project type detection (from src/lib/project.ts) --

function dev_setup(p: ProjectType): string {
  return `#!/usr/bin/env bash
# bny-generated
set -e

cd "$(dirname "$0")/.."

echo "installing dependencies..."
${p.install_cmd}

echo "configuring git hooks..."
git config core.hooksPath .githooks

echo "done."
`
}

function dev_test(p: ProjectType): string {
  return `#!/usr/bin/env bash
# bny-generated
set -e
cd "$(dirname "$0")/.."
exec ${p.test_cmd} "$@"
`
}

function dev_pre_flight(p: ProjectType): string {
  return `#!/usr/bin/env bash
# bny-generated
set -e
cd "$(dirname "$0")/.."

echo "pre_flight: checking..."

# tests pass
./dev/test 2>/dev/null || { echo "pre_flight: FAIL — tests"; exit 1; }

echo "pre_flight: ok"
`
}

function dev_post_flight(_p: ProjectType): string {
  return `#!/usr/bin/env bash
# bny-generated
set -e
cd "$(dirname "$0")/.."

echo "post_flight: checking..."

# tests pass
./dev/test 2>/dev/null || { echo "post_flight: FAIL — tests"; exit 1; }

echo "post_flight: ok"
`
}

const DEV_HEALTH = `#!/usr/bin/env bash
# bny-generated
set -e
cd "$(dirname "$0")/.."

# customize this for your project
echo '{"status":"success","path":"/health","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
`
