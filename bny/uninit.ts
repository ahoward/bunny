#!/usr/bin/env bun
//
// bny uninit — cleanly remove all bny traces from a project
//
// strips marker-delimited blocks from files, removes bny-generated
// dev scripts, removes .bny/ state directory.
//
// usage:
//   bny uninit          # interactive confirmation
//   bny uninit --force  # skip confirmation
//

import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, rmSync, lstatSync } from "node:fs"
import { resolve } from "node:path"

// -- marker stripping --

function strip_marker(abs_path: string, start_marker: string, end_marker: string): "stripped" | "skipped" | "removed" {
  if (!existsSync(abs_path)) return "skipped"

  const content = readFileSync(abs_path, "utf-8")
  const start_idx = content.indexOf(start_marker)
  const end_idx = content.indexOf(end_marker)

  if (start_idx === -1 || end_idx === -1 || end_idx <= start_idx) return "skipped"

  const before = content.slice(0, start_idx)
  const after = content.slice(end_idx + end_marker.length)
  const cleaned = (before + after).replace(/\n{3,}/g, "\n\n").trim()

  if (cleaned.length === 0) {
    unlinkSync(abs_path)
    return "removed"
  }

  writeFileSync(abs_path, cleaned + "\n")
  return "stripped"
}

function is_dir_empty(abs_path: string): boolean {
  if (!existsSync(abs_path)) return false
  try {
    return readdirSync(abs_path).length === 0
  } catch {
    return false
  }
}

// -- main --

export async function main(argv: string[]): Promise<number> {
  let force = false

  for (const arg of argv) {
    if (arg === "--force" || arg === "-f") force = true
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny uninit [--force]

cleanly removes all bny traces from the project.

removes:
  - marker blocks from CLAUDE.md, GEMINI.md, AGENTS.md, .gitignore, .githooks/*
  - bny-generated dev/ scripts (identified by "# bny-generated" marker)
  - .bny/ state directory

files with only bny content are deleted entirely.
files with other content keep their non-bny parts.

flags:
  --force, -f     skip confirmation prompt
`)
      return 0
    }
  }

  const root = process.cwd()

  if (!existsSync(resolve(root, ".bny")) && !existsSync(resolve(root, ".git"))) {
    process.stderr.write("error: not a bny project (no .bny/ directory found)\n")
    return 1
  }

  // -- confirmation --

  if (!force) {
    process.stderr.write("this will remove all bny state and markers from this project.\n")
    process.stderr.write("run with --force to confirm, or ctrl-c to abort.\n")
    return 1
  }

  process.stderr.write("[bny uninit]\n\n")

  let stripped = 0
  let removed = 0
  let skipped_count = 0

  function tally(result: "stripped" | "skipped" | "removed", label: string): void {
    if (result === "stripped") { stripped++; process.stderr.write(`  strip    ${label}\n`) }
    if (result === "removed")  { removed++;  process.stderr.write(`  remove   ${label}\n`) }
    if (result === "skipped")  { skipped_count++ }
  }

  // -- strip markdown marker blocks --

  const md_files = [
    "CLAUDE.md",
    "GEMINI.md",
    "AGENTS.md",
    ".github/agents/copilot-instructions.md",
    ".cursor/rules/bny.mdc",
    ".windsurf/rules/bny.md",
    ".kilocode/rules/bny.md",
    ".augment/rules/bny.md",
    ".roo/rules/bny.md",
  ]

  for (const f of md_files) {
    tally(strip_marker(resolve(root, f), "<!-- bny:start -->", "<!-- bny:end -->"), f)
  }

  // -- strip shell marker blocks --

  const shell_files = [
    ".githooks/pre-commit",
    ".githooks/pre-push",
    ".gitignore",
  ]

  for (const f of shell_files) {
    tally(strip_marker(resolve(root, f), "# bny:start", "# bny:end"), f)
  }

  // -- remove bny-generated dev scripts --

  const dev_scripts = ["dev/setup", "dev/test", "dev/health", "dev/pre_flight", "dev/post_flight"]
  for (const f of dev_scripts) {
    const abs = resolve(root, f)
    if (!existsSync(abs)) continue

    try {
      const content = readFileSync(abs, "utf-8")
      const lines = content.split("\n")
      // check line 2 (index 1) for bny-generated marker
      if (lines.length >= 2 && lines[1] === "# bny-generated") {
        unlinkSync(abs)
        removed++
        process.stderr.write(`  remove   ${f}\n`)
      }
    } catch {
      // skip files we can't read
    }
  }

  // -- clean up empty directories --

  for (const dir of [".githooks", "dev"]) {
    const abs = resolve(root, dir)
    if (is_dir_empty(abs)) {
      rmSync(abs, { recursive: true })
      process.stderr.write(`  rmdir    ${dir}/\n`)
    }
  }

  // -- remove .bny/ state --

  const bny_state = resolve(root, ".bny")
  if (existsSync(bny_state)) {
    rmSync(bny_state, { recursive: true })
    removed++
    process.stderr.write(`  remove   .bny/\n`)
  }

  // -- summary --

  const parts = []
  if (stripped > 0) parts.push(`${stripped} stripped`)
  if (removed > 0) parts.push(`${removed} removed`)
  if (skipped_count > 0) parts.push(`${skipped_count} skipped`)
  process.stderr.write(`\n  ${parts.join(", ")}\n`)
  process.stderr.write(`\n  bny has left the building.\n`)

  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
