#!/usr/bin/env bun
//
// bny test-gen — gemini generates test suite from spec
//
// reads spec (+ challenge if available) + plan, asks gemini to
// generate contract, property, golden file, and boundary tests.
// language-portable via project type detection.
//
// usage:
//   bny test-gen                    # current feature
//   bny test-gen 001-auth           # explicit feature
//   bny test-gen --prompt-only      # write prompt file instead
//   bny test-gen --dry-run          # show what would run
//

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { success, error } from "./lib/result.ts"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { read_section, build_prompt } from "./lib/prompt.ts"
import { parse_json, strip_index_preamble } from "./lib/brane.ts"
import { spawn_async, which_check } from "./lib/spawn.ts"
import { detect_project_type } from "./lib/project.ts"

// -- types --

interface TestGenResponse {
  files:        { path: string, content: string }[]
  fixtures?:    { path: string, content: string }[]
  dependencies?: string[]
  reasoning:    string
}

export async function main(argv: string[]): Promise<number> {
  let target: string | null = null
  let prompt_only = false
  let dry_run = false

  for (const arg of argv) {
    if (arg === "--prompt-only") {
      prompt_only = true
    } else if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny test-gen [--prompt-only] [--dry-run] [feature-name]\n")
      process.stdout.write("\nasks gemini to generate a test suite from the spec.\n")
      process.stdout.write("generates contract, property, golden file, and boundary tests.\n")
      return 0
    } else if (!arg.startsWith("-")) {
      target = arg
    }
  }

  const root = find_root()
  const name = target || current_feature()

  if (!name) {
    const result = error({ feature: [{ code: "not_found", message: "no feature specified and not on a feature branch" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  const paths = feature_paths(root, name)

  if (!existsSync(paths.spec)) {
    const result = error({ spec: [{ code: "missing", message: `${paths.spec} does not exist — run bny specify first` }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  // -- detect project type --

  const project = detect_project_type(root)

  // -- build prompt --

  const challenge_path = resolve(paths.dir, "challenge.md")
  const sections = [
    read_section("Feature Specification", paths.spec),
    read_section("Adversary Challenge", challenge_path),
    read_section("Implementation Plan", paths.plan),
  ].filter((s): s is NonNullable<typeof s> => s !== null)

  const instructions = [
    `You are generating a test suite for a **${project.type}** project.`,
    `Test framework: **${project.test_framework}**`,
    `Test directory: **${project.test_dir}**`,
    `Property testing library: **${project.property_lib || "(none available)"}**`,
    `Test runner: \`${project.test_cmd}\``,
    "",
    "Generate 4 layers of tests from the specification above:",
    "",
    "## 1. Contract Tests",
    "One test per acceptance scenario (Given/When/Then → test case).",
    "Test the public interface, not internals. These are the specification as code.",
    "",
    "## 2. Property Tests",
    "From key entities and invariants. Use the property testing library above.",
    "Examples: roundtrip (parse∘format = identity), idempotency, commutativity, monotonicity.",
    project.property_lib ? "" : "If no property library is available, write manual property-style tests with random-ish inputs.",
    "",
    "## 3. Golden File Tests",
    "Capture known-good output for key operations.",
    "Store expected output as fixture files. Diff on regression.",
    "",
    "## 4. Boundary Tests",
    "From edge cases in the spec and challenge. Empty input, max size,",
    "malformed data, unicode, off-by-one, null/missing fields.",
    "",
    "Rules:",
    `- Tests MUST be runnable with \`${project.test_cmd}\``,
    "- Tests MUST fail before implementation exists (import errors are acceptable failures)",
    "- Import paths must match the plan's file structure",
    "- Use the project's idiomatic test patterns",
    "- No mocks unless absolutely necessary — test real behavior",
    "- Each test file should be self-contained and focused on one concern",
    "",
    "Respond with ONLY valid JSON (no markdown fences):",
    "{",
    '  "files": [',
    '    { "path": "tests/contracts/parser.test.ts", "content": "..." }',
    "  ],",
    '  "fixtures": [',
    '    { "path": "tests/fixtures/basic.csv", "content": "..." }',
    "  ],",
    '  "dependencies": ["fast-check"],',
    '  "reasoning": "why these test layers and what they cover"',
    "}",
  ].filter(s => s !== "").join("\n")

  const prompt = build_prompt(sections, instructions)

  // -- prompt-only mode --

  if (prompt_only) {
    const prompt_file = resolve(paths.dir, "test-gen-prompt.md")
    await Bun.write(prompt_file, prompt)
    const meta = { path: "/bny/test-gen", timestamp: new Date().toISOString(), duration_ms: 0 }
    process.stdout.write(JSON.stringify(success({ feature: name, prompt_file }, meta), null, 2) + "\n")
    return 0
  }

  // -- dry-run mode --

  if (dry_run) {
    process.stderr.write(`[test-gen] dry-run for: ${name}\n`)
    process.stderr.write(`  project: ${project.type}\n`)
    process.stderr.write(`  framework: ${project.test_framework}\n`)
    process.stderr.write(`  test dir: ${project.test_dir}\n`)
    process.stderr.write(`  property lib: ${project.property_lib || "(none)"}\n`)
    return 0
  }

  // -- shell out to gemini --

  if (!which_check("gemini")) {
    const result = error({ gemini: [{ code: "not_found", message: "gemini CLI not found on PATH — use --prompt-only to generate the prompt file instead" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  process.stderr.write(`[test-gen] generating tests for: ${name} (${project.type}/${project.test_framework})\n`)

  const model = process.env.BNY_MODEL || null
  const cmd: string[] = ["gemini", "-p", prompt]
  if (model) cmd.push("--model", model)

  const r = await spawn_async({
    cmd,
    cwd: root,
    stdout: "pipe",
    stderr: "inherit",
    assassin_dir: resolve(root, "bny"),
    label: "gemini test-gen",
  })

  if (!r.ok || !r.stdout) {
    process.stderr.write(`error: gemini test-gen failed: ${r.detail}\n`)
    return r.exit_code
  }

  // -- parse response --

  let response = parse_json<TestGenResponse>(r.stdout)
  if (!response) {
    // retry with a nudge
    process.stderr.write("warning: failed to parse test-gen response, retrying...\n")
    const retry_cmd: string[] = ["gemini", "-p", prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences."]
    if (model) retry_cmd.push("--model", model)
    const r2 = await spawn_async({
      cmd: retry_cmd,
      cwd: root,
      stdout: "pipe",
      stderr: "inherit",
      assassin_dir: resolve(root, "bny"),
      label: "gemini test-gen retry",
    })
    if (r2.ok && r2.stdout) {
      response = parse_json<TestGenResponse>(r2.stdout)
    }
    if (!response) {
      process.stderr.write("error: could not get structured test-gen response from gemini\n")
      return 1
    }
  }

  if (!response.files || response.files.length === 0) {
    process.stderr.write("error: gemini generated no test files\n")
    return 1
  }

  // -- write test files --

  let written = 0

  for (const file of response.files) {
    const abs = resolve(root, file.path)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, file.content)
    process.stderr.write(`  + ${file.path}\n`)
    written++
  }

  if (response.fixtures) {
    for (const fixture of response.fixtures) {
      const abs = resolve(root, fixture.path)
      mkdirSync(dirname(abs), { recursive: true })
      writeFileSync(abs, fixture.content)
      process.stderr.write(`  + ${fixture.path} (fixture)\n`)
      written++
    }
  }

  // -- note dependencies --

  if (response.dependencies && response.dependencies.length > 0) {
    process.stderr.write(`\nsuggested dependencies: ${response.dependencies.join(", ")}\n`)
    process.stderr.write(`  install with: ${project.install_cmd.split(" ")[0]} add -d ${response.dependencies.join(" ")}\n`)
  }

  process.stderr.write(`\n[test-gen] wrote ${written} file(s)\n`)

  const meta = { path: "/bny/test-gen", timestamp: new Date().toISOString(), duration_ms: 0 }
  process.stdout.write(JSON.stringify(success({
    feature: name,
    files: response.files.map(f => f.path),
    fixtures: (response.fixtures || []).map(f => f.path),
    dependencies: response.dependencies || [],
  }, meta), null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
