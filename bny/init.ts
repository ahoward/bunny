#!/usr/bin/env bun
//
// bny init — scaffold a project for bny
//
// creates .bny/, dev/, .githooks/ with lean defaults.
// safe to re-run: skips existing files unless --force.
//
// usage:
//   bny init              # scaffold everything
//   bny init --force      # overwrite existing files
//   bny init --minimal    # just .bny/ state, no dev scripts
//

import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

export async function main(argv: string[]): Promise<number> {
  let force = false
  let minimal = false

  for (const arg of argv) {
    if (arg === "--force" || arg === "-f") force = true
    else if (arg === "--minimal") minimal = true
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny init [--force] [--minimal]

scaffolds a project for bny.

creates:
  .bny/              project state (constitution, guardrails, roadmap, decisions)
  .bny/brane/        knowledge base (worldview, index)
  dev/               development scripts (setup, test, health, pre_flight, post_flight)
  .githooks/         git hooks (pre-commit, pre-push)

flags:
  --force, -f     overwrite existing files
  --minimal       just .bny/ state, no dev scripts or hooks
`)
      return 0
    }
  }

  const root = process.cwd()

  // -- check git repo --

  if (!existsSync(resolve(root, ".git"))) {
    process.stderr.write("error: not a git repository — run 'git init' first\n")
    return 1
  }

  // -- scaffold --

  let created = 0
  let skipped = 0

  function write(rel_path: string, content: string, executable = false): void {
    const abs = resolve(root, rel_path)
    if (existsSync(abs) && !force) {
      skipped++
      return
    }
    const dir = resolve(abs, "..")
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(abs, content)
    if (executable) chmodSync(abs, 0o755)
    process.stderr.write(`  create  ${rel_path}\n`)
    created++
  }

  process.stderr.write(`[bny init] ${force ? "(force) " : ""}${minimal ? "(minimal) " : ""}\n\n`)

  // -- .bny/ state --

  write(".bny/constitution.md", CONSTITUTION)
  write(".bny/guardrails.json", GUARDRAILS)
  write(".bny/roadmap.md", ROADMAP)
  write(".bny/decisions.md", DECISIONS)
  write(".bny/todos.md", TODOS)

  // -- .bny/brane/ --

  write(".bny/brane/worldview.md", WORLDVIEW)
  write(".bny/brane/index.md", BRANE_INDEX)

  if (!minimal) {
    // -- dev/ scripts --

    write("dev/setup", DEV_SETUP, true)
    write("dev/test", DEV_TEST, true)
    write("dev/health", DEV_HEALTH, true)
    write("dev/pre_flight", DEV_PRE_FLIGHT, true)
    write("dev/post_flight", DEV_POST_FLIGHT, true)

    // -- .githooks/ --

    write(".githooks/pre-commit", HOOK_PRE_COMMIT, true)
    write(".githooks/pre-push", HOOK_PRE_PUSH, true)

    // -- .gitignore additions --

    const gi_path = resolve(root, ".gitignore")
    const gi_marker = "# bny"
    const existing_gi = existsSync(gi_path) ? readFileSync(gi_path, "utf-8") : ""
    if (!existing_gi.includes(gi_marker)) {
      const additions = `\n${gi_marker}\n.bny/bny.pid\n.bny/children/\n.bny/spin/\n`
      writeFileSync(gi_path, existing_gi.trimEnd() + "\n" + additions)
      process.stderr.write(`  append  .gitignore\n`)
      created++
    }

    // -- configure git hooks path --

    const hooks_check = Bun.spawnSync(["git", "config", "core.hooksPath"], { stdout: "pipe", stderr: "pipe" })
    const current_hooks = new TextDecoder().decode(hooks_check.stdout).trim()
    if (current_hooks !== ".githooks") {
      Bun.spawnSync(["git", "config", "core.hooksPath", ".githooks"], { stdout: "pipe", stderr: "pipe" })
      process.stderr.write(`  config  git core.hooksPath → .githooks\n`)
    }
  }

  // -- summary --

  process.stderr.write(`\n  ${created} created, ${skipped} skipped (already exist)\n`)
  if (skipped > 0 && !force) {
    process.stderr.write(`  use --force to overwrite existing files\n`)
  }
  process.stderr.write(`\n  next: edit .bny/roadmap.md, then run 'bny ipm' to plan\n`)

  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))

// -- templates --

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
bny builds bny. The brane accumulates knowledge. Each iteration enriches
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
    ".bny/guardrails.json",
    ".bny/decisions.md"
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

const WORLDVIEW = `# Worldview

This is the project's accumulated knowledge and perspective.

Feed documents, research, and feedback with \`bny brane eat\`.
Query the brane with \`bny brane ask\`.
`

const BRANE_INDEX = `# Brane Index

<!-- auto-generated by bny brane operations -->

## Sources

(none yet)
`

const DEV_SETUP = `#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

echo "installing dependencies..."
bun install

echo "configuring git hooks..."
git config core.hooksPath .githooks

echo "done."
`

const DEV_TEST = `#!/usr/bin/env bash
set -e
BUNNY_LOG=0 exec bun test "$@"
`

const DEV_HEALTH = `#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# customize this for your project
echo '{"status":"success","path":"/health","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
`

const DEV_PRE_FLIGHT = `#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

echo "pre_flight: checking..."

# tests pass
bun test 2>/dev/null || { echo "pre_flight: FAIL — tests"; exit 1; }

echo "pre_flight: ok"
`

const DEV_POST_FLIGHT = `#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

echo "post_flight: checking..."

# tests pass
bun test 2>/dev/null || { echo "post_flight: FAIL — tests"; exit 1; }

echo "post_flight: ok"
`

const HOOK_PRE_COMMIT = `#!/usr/bin/env bash
set -e
BUNNY_LOG=0 exec ./dev/post_flight
`

const HOOK_PRE_PUSH = `#!/usr/bin/env bash
set -e
exec ./dev/test
`
