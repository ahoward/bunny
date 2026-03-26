#!/usr/bin/env bun
//
// bny test-gen — gemini generates test suite from spec
//
// supports 3-round narrowing (--round 1|2|3) or all-at-once (default).
// each round gets progressively more adversarial:
//   round 1: contracts — the spec as code
//   round 2: properties — behavioral invariants (sees claude's source)
//   round 3: boundaries + golden — edge cases + regression snapshots (sees source + all tests)
//
// usage:
//   bny test-gen                        # all layers at once (backward compat)
//   bny test-gen --round 1              # contracts only
//   bny test-gen --round 2              # properties (needs source code)
//   bny test-gen --round 3              # boundaries + golden (needs source + tests)
//   bny test-gen --prompt-only          # write prompt file instead
//   bny test-gen --dry-run              # show what would run
//

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { success, error } from "./lib/result.ts"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { read_section, build_prompt } from "./lib/prompt.ts"
import { parse_json, strip_index_preamble } from "./lib/brane.ts"
import { spawn_async, which_check, create_sandbox } from "./lib/spawn.ts"
import { detect_project_type } from "./lib/project.ts"

// -- types --

interface TestGenResponse {
  files:        { path: string, content: string }[]
  fixtures?:    { path: string, content: string }[]
  dependencies?: string[]
  reasoning:    string
}

// -- helpers --

function collect_source_files(root: string): string {
  const src_dir = resolve(root, "src")
  if (!existsSync(src_dir)) return "(no src/ directory)"
  const parts: string[] = []
  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(resolve(dir, entry.name), rel)
      } else {
        const content = readFileSync(resolve(dir, entry.name), "utf-8")
        parts.push(`## src/${rel}\n\n\`\`\`\n${content}\n\`\`\``)
      }
    }
  }
  walk(src_dir, "")
  return parts.length > 0 ? parts.join("\n\n") : "(no source files)"
}

function collect_test_files(root: string, test_dir: string): string {
  const abs_dir = resolve(root, test_dir)
  if (!existsSync(abs_dir)) return "(no test directory)"
  const parts: string[] = []
  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(resolve(dir, entry.name), rel)
      } else if (/\.(test|spec)\.(ts|js|tsx|jsx|py|rb|rs|go)$/.test(entry.name) || entry.name.endsWith("_test.go")) {
        const content = readFileSync(resolve(dir, entry.name), "utf-8")
        parts.push(`## ${test_dir}/${rel}\n\n\`\`\`\n${content}\n\`\`\``)
      }
    }
  }
  walk(abs_dir, "")
  return parts.length > 0 ? parts.join("\n\n") : "(no test files yet)"
}

// -- round-specific prompt builders --

function build_round_instructions(round: number, project: ReturnType<typeof detect_project_type>): string {
  const header = [
    `You are generating tests for a **${project.type}** project.`,
    `Test framework: **${project.test_framework}**`,
    `Test directory: **${project.test_dir}**`,
    `Property testing library: **${project.property_lib || "(none available)"}**`,
    `Test runner: \`${project.test_cmd}\``,
    "",
  ]

  const rules = [
    "",
    "Rules:",
    `- Tests MUST be runnable with \`${project.test_cmd}\``,
    `- CRITICAL: Import from \`${project.test_framework}\` ONLY. Do NOT use jest, vitest, mocha, @jest/globals, or any other test framework. Every test file MUST start with: import { describe, test, expect } from "${project.test_framework}"`,
    "- Import paths must match the plan's file structure",
    "- Use the project's idiomatic test patterns",
    "- No mocks unless absolutely necessary — test real behavior",
    "- Each test file should be self-contained and focused on one concern",
    "- For every error/failure path: assert the specific error type, message, or shape — not just that it throws. `expect(() => ...).toThrow()` alone is INSUFFICIENT. Use `.toThrow(/pattern/)` or check error properties.",
    "- If the spec contains an Edge Cases table or section, you MUST generate a test for EVERY edge case listed. This is not optional — missing edge case coverage is a test generation failure.",
  ]

  const json_schema = [
    "",
    "Respond with ONLY valid JSON (no markdown fences):",
    "{",
    '  "files": [',
    '    { "path": "tests/...", "content": "..." }',
    "  ],",
    '  "fixtures": [',
    '    { "path": "tests/fixtures/...", "content": "..." }',
    "  ],",
    '  "dependencies": ["fast-check"],',
    '  "reasoning": "what these tests cover and why"',
    "}",
  ]

  let body: string[]

  switch (round) {
    case 1:
      body = [
        "## Round 1: Contract Tests",
        "",
        "Generate contract tests — one test per acceptance scenario from the spec.",
        "These are the specification as code: Given/When/Then → test case.",
        "Test the public interface, not internals.",
        "",
        "MANDATORY: If the spec has an Edge Cases section or table, generate a dedicated test",
        "for EVERY edge case listed. Each row in the edge case table = one test. Name the test",
        "after the edge case ID or description. This coverage is required, not optional.",
        "",
        "Do NOT generate property tests, golden file tests, or boundary tests.",
        "Those come in later rounds.",
        "",
        "- Tests MUST fail before implementation exists (import errors are acceptable)",
      ]
      break

    case 2:
      body = [
        "## Round 2: Property Tests",
        "",
        "The implementation below passes all contract tests. Now write property tests",
        "that probe behavioral invariants the contracts don't catch.",
        "",
        "Use the property testing library above. Target the ACTUAL implementation —",
        "look at the source code and find invariants that should hold:",
        "roundtrip (parse∘format = identity), idempotency, commutativity, monotonicity.",
        "",
        project.property_lib
          ? `Use \`${project.property_lib}\` for generators and assertions.`
          : "No property library available — write manual property-style tests with varied inputs.",
        "",
        "IMPORTANT: Generators MUST include adversarial inputs — boundary values, empty strings,",
        "maximum sizes, special characters that commonly break parsers (hyphens, dots, backslashes,",
        "quotes, unicode, null bytes, extremely long strings). Do NOT restrict generators to",
        "safe/simple/alphanumeric values. The entire point is to find bugs that safe inputs miss.",
        "",
        "Also test security-relevant invariants: prototype pollution (keys like __proto__,",
        "constructor, prototype), injection vectors, and denial-of-service inputs (deeply nested",
        "structures, very large inputs).",
        "",
        "Do NOT regenerate contract tests. Only add property tests.",
        "Focus on what the contract tests miss.",
      ]
      break

    case 3:
      body = [
        "## Round 3: Boundary Tests + Golden Files",
        "",
        "The implementation passes contract and property tests. Now write:",
        "",
        "### Boundary Tests",
        "From edge cases in the spec and challenge. Target the actual code:",
        "empty input, max size, malformed data, unicode, off-by-one, null/missing fields.",
        "Look at the source code — find the fragile spots.",
        "",
        "### Golden File Tests",
        "Capture known-good output for key operations as fixture files.",
        "Diff on regression. These lock the current (correct) behavior.",
        "",
        "Do NOT regenerate contract or property tests. Only add boundary + golden.",
        "Focus on where this specific implementation is weakest.",
      ]
      break

    default:
      // all layers at once (backward compat)
      body = [
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
        "- Tests MUST fail before implementation exists (import errors are acceptable failures)",
      ]
      break
  }

  return [...header, ...body, ...rules, ...json_schema].filter(s => s !== "").join("\n")
}

// -- main --

export async function main(argv: string[]): Promise<number> {
  let target: string | null = null
  let prompt_only = false
  let dry_run = false
  let round = 0  // 0 = all layers (backward compat)

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--prompt-only") {
      prompt_only = true
    } else if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--round" && argv[i + 1]) {
      round = parseInt(argv[i + 1], 10)
      if (isNaN(round) || round < 1 || round > 3) {
        process.stderr.write("error: --round must be 1, 2, or 3\n")
        return 1
      }
      i++
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny test-gen [--round 1|2|3] [--prompt-only] [--dry-run] [feature-name]

asks gemini to generate tests from the spec.

rounds (narrowing):
  --round 1    contract tests only (spec as code)
  --round 2    property tests (sees implementation source)
  --round 3    boundary + golden file tests (sees source + all tests)
  (default)    all 4 layers at once

the narrowing strategy: round 1 locks the API shape, round 2 probes
behavioral invariants, round 3 finds edge cases. each round sees more
context and gets more adversarial.
`)
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
  const round_label = round > 0 ? ` round ${round}` : ""

  // -- build prompt --

  const challenge_path = resolve(paths.dir, "challenge.md")
  const sections = [
    read_section("Feature Specification", paths.spec),
    read_section("Adversary Challenge", challenge_path),
    read_section("Implementation Plan", paths.plan),
  ].filter((s): s is NonNullable<typeof s> => s !== null)

  // rounds 2-3: include source code (so gemini can target the actual implementation)
  if (round >= 2) {
    const source = collect_source_files(root)
    if (source !== "(no src/ directory)" && source !== "(no source files)") {
      sections.push({ heading: "Current Implementation (source code)", content: source })
    }
  }

  // rounds 2-3: include existing test files (so gemini knows what's already covered)
  if (round >= 2) {
    const tests = collect_test_files(root, project.test_dir)
    if (tests !== "(no test directory)" && tests !== "(no test files yet)") {
      sections.push({ heading: "Existing Tests (already passing)", content: tests })
    }
  }

  const instructions = build_round_instructions(round, project)
  const prompt = build_prompt(sections, instructions)

  // -- prompt-only mode --

  if (prompt_only) {
    const suffix = round > 0 ? `-round${round}` : ""
    const prompt_file = resolve(paths.dir, `test-gen${suffix}-prompt.md`)
    await Bun.write(prompt_file, prompt)
    const meta = { path: "/bny/test-gen", timestamp: new Date().toISOString(), duration_ms: 0 }
    process.stdout.write(JSON.stringify(success({ feature: name, round, prompt_file }, meta), null, 2) + "\n")
    return 0
  }

  // -- dry-run mode --

  if (dry_run) {
    process.stderr.write(`[test-gen${round_label}] dry-run for: ${name}\n`)
    process.stderr.write(`  project: ${project.type}\n`)
    process.stderr.write(`  framework: ${project.test_framework}\n`)
    process.stderr.write(`  test dir: ${project.test_dir}\n`)
    process.stderr.write(`  property lib: ${project.property_lib || "(none)"}\n`)
    if (round > 0) process.stderr.write(`  round: ${round}\n`)
    return 0
  }

  // -- shell out to gemini --

  if (!which_check("gemini")) {
    const result = error({ gemini: [{ code: "not_found", message: "gemini CLI not found on PATH — use --prompt-only to generate the prompt file instead" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  process.stderr.write(`[test-gen${round_label}] generating tests for: ${name} (${project.type}/${project.test_framework})\n`)

  const sandbox = create_sandbox(root)
  const model = process.env.BNY_MODEL || null

  // write prompt to temp file to avoid ARG_MAX limits
  const prompt_tmp = resolve(root, `bny/test-gen-prompt-${process.pid}.tmp`)
  await Bun.write(prompt_tmp, prompt)

  const cmd: string[] = ["gemini", "-p", ""]
  if (model) cmd.push("--model", model)

  const r = await spawn_async({
    cmd,
    cwd: sandbox.cwd,
    env: sandbox.env,
    stdin: Bun.file(prompt_tmp),
    stdout: "pipe",
    stderr: "inherit",
    assassin_dir: resolve(root, "bny"),
    label: `gemini test-gen${round_label}`,
  })

  if (!r.ok || !r.stdout) {
    try { unlinkSync(prompt_tmp) } catch {}
    process.stderr.write(`error: gemini test-gen${round_label} failed: ${r.detail}\n`)
    return r.exit_code
  }

  // -- parse response --

  let response = parse_json<TestGenResponse>(r.stdout)
  if (!response) {
    // retry with a nudge
    process.stderr.write("warning: failed to parse test-gen response, retrying...\n")
    const retry_prompt = prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences."
    await Bun.write(prompt_tmp, retry_prompt)

    const retry_cmd: string[] = ["gemini", "-p", ""]
    if (model) retry_cmd.push("--model", model)
    const r2 = await spawn_async({
      cmd: retry_cmd,
      cwd: sandbox.cwd,
      env: sandbox.env,
      stdin: Bun.file(prompt_tmp),
      stdout: "pipe",
      stderr: "inherit",
      assassin_dir: resolve(root, "bny"),
      label: `gemini test-gen${round_label} retry`,
    })
    if (r2.ok && r2.stdout) {
      response = parse_json<TestGenResponse>(r2.stdout)
    }
    if (!response) {
      try { unlinkSync(prompt_tmp) } catch {}
      process.stderr.write(`error: could not get structured test-gen response from gemini\n`)
      return 1
    }
  }

  try { unlinkSync(prompt_tmp) } catch {}

  if (!response.files || response.files.length === 0) {
    process.stderr.write(`error: gemini generated no test files\n`)
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

  process.stderr.write(`\n[test-gen${round_label}] wrote ${written} file(s)\n`)

  const meta = { path: "/bny/test-gen", timestamp: new Date().toISOString(), duration_ms: 0 }
  process.stdout.write(JSON.stringify(success({
    feature: name,
    round,
    files: response.files.map(f => f.path),
    fixtures: (response.fixtures || []).map(f => f.path),
    dependencies: response.dependencies || [],
  }, meta), null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
