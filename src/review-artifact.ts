#!/usr/bin/env bun
//
// bny review-artifact — generate a build review document
//
// produces a structured summary of what was built, what changed behaviorally,
// what tests cover it, and what the adversarial review found.
//
// this is what a human reviewer reads instead of the code diff.
//
// usage:
//   bny review-artifact                  # current feature
//   bny review-artifact 001-auth         # explicit feature
//

import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs"
import { resolve, relative } from "node:path"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { detect_project_type } from "./lib/project.ts"
import { spawn_sync } from "./lib/spawn.ts"

function count_tests(root: string, test_dir: string): number {
  const abs = resolve(root, test_dir)
  if (!existsSync(abs)) return 0
  let count = 0
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (/\.(test|spec)\.(ts|js|tsx|jsx)$/.test(entry.name)) {
        const content = readFileSync(full, "utf-8")
        const matches = content.match(/\b(test|it)\s*\(/g)
        count += matches ? matches.length : 0
      }
    }
  }
  walk(abs)
  return count
}

function count_adversarial(root: string, feature: string): { files: number, tests: number } {
  const dir = resolve(root, "tests", "adversarial", feature)
  if (!existsSync(dir)) return { files: 0, tests: 0 }
  let files = 0
  let tests = 0
  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = resolve(d, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (/\.(test|spec)\.(ts|js|tsx|jsx)$/.test(entry.name)) {
        files++
        const content = readFileSync(full, "utf-8")
        const matches = content.match(/\b(test|it)\s*\(/g)
        tests += matches ? matches.length : 0
      }
    }
  }
  walk(dir)
  return { files, tests }
}

export async function main(argv: string[]): Promise<number> {
  let target: string | null = null

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny review-artifact [feature-name]\n")
      process.stdout.write("\ngenerate a build review document for human approval.\n")
      return 0
    } else if (!arg.startsWith("-")) {
      target = arg
    }
  }

  const root = find_root()
  const name = target || current_feature()

  if (!name) {
    process.stderr.write("error: no feature specified and not on a feature branch\n")
    return 1
  }

  const paths = feature_paths(root, name)
  const project = detect_project_type(root)
  const today = new Date().toISOString().slice(0, 19).replace("T", " ")

  // -- run tests to get status --

  const test_result = spawn_sync({
    cmd: project.test_cmd.split(" "),
    cwd: root,
    label: "test run",
  })
  const tests_pass = test_result.ok
  const test_count = count_tests(root, project.test_dir)
  const adversarial = count_adversarial(root, name)

  // -- gather SPEC.md diff --

  let spec_md_section = "(no SPEC.md found)"
  if (existsSync(paths.spec_md)) {
    // try git diff for SPEC.md changes
    const diff_r = spawn_sync({
      cmd: ["git", "diff", "HEAD", "--", relative(root, paths.spec_md)],
      cwd: root,
      label: "spec diff",
    })
    if (diff_r.ok && diff_r.stdout.trim().length > 0) {
      spec_md_section = diff_r.stdout.trim()
    } else {
      spec_md_section = "(no changes to SPEC.md in this build)"
    }
  }

  // -- gather verify findings --

  const verify_path = resolve(paths.dir, "verify.md")
  const verify_section = existsSync(verify_path)
    ? readFileSync(verify_path, "utf-8").trim()
    : "(verify not yet run)"

  // -- gather git stats --

  const stat_r = spawn_sync({ cmd: ["git", "diff", "--stat", "HEAD~1"], cwd: root, label: "git stat" })
  const git_stats = stat_r.ok ? stat_r.stdout.trim() : "(no git stats available)"

  // -- build artifact --

  const lines = [
    `# Build Review: ${name}`,
    `Date: ${today}`,
    `Status: ${tests_pass ? "PASSING" : "FAILING"}`,
    "",
    "## Behavioral Changes (SPEC.md)",
    "",
    "```diff",
    spec_md_section,
    "```",
    "",
    "## Test Suite",
    "",
    `| Category | Count |`,
    `|----------|-------|`,
    `| Total tests | ${test_count} |`,
    `| Adversarial (locked) | ${adversarial.tests} in ${adversarial.files} file(s) |`,
    `| All passing | ${tests_pass ? "YES" : "NO"} |`,
    "",
    "## Adversary Findings (Gemini Verify)",
    "",
    verify_section,
    "",
    "## Files Changed",
    "",
    "```",
    git_stats,
    "```",
    "",
  ]

  const artifact = lines.join("\n")

  writeFileSync(paths.review, artifact)
  process.stderr.write(`[review-artifact] wrote ${paths.review}\n`)

  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
