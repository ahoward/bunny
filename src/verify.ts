#!/usr/bin/env bun
//
// bny verify — gemini post-implementation adversary review
//
// after implementation and tests pass, asks gemini to review
// whether tests actually test behavior, find untested paths,
// and check spec intent vs implementation reality.
//
// usage:
//   bny verify                    # current feature
//   bny verify 001-auth           # explicit feature
//   bny verify --prompt-only      # write prompt file instead
//

import { existsSync, writeFileSync, readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "./lib/result.ts"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { read_section, build_prompt } from "./lib/prompt.ts"
import { strip_index_preamble } from "./lib/brane.ts"
import { spawn_async, spawn_sync, which_check, create_sandbox } from "./lib/spawn.ts"
import { detect_project_type } from "./lib/project.ts"

// -- helpers --

function collect_test_files(root: string, test_dir: string): string {
  const abs_dir = resolve(root, test_dir)
  if (!existsSync(abs_dir)) return "(no test directory found)"

  const files: string[] = []
  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(resolve(dir, entry.name), rel)
      } else if (/\.(test|spec)\.(ts|js|tsx|jsx|py|rb|rs|go)$/.test(entry.name) || entry.name.endsWith("_test.go")) {
        const content = readFileSync(resolve(dir, entry.name), "utf-8")
        files.push(`## ${rel}\n\n\`\`\`\n${content}\n\`\`\``)
      }
    }
  }
  walk(abs_dir, "")
  return files.length > 0 ? files.join("\n\n") : "(no test files found)"
}

function collect_source_code(root: string): string {
  // inline full source code so gemini can actually find bugs
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

export async function main(argv: string[]): Promise<number> {
  let target: string | null = null
  let prompt_only = false
  let mode: "adversarial" | "behavioral" = "adversarial"

  for (const arg of argv) {
    if (arg === "--prompt-only") {
      prompt_only = true
    } else if (arg === "--behavioral") {
      mode = "behavioral"
    } else if (arg === "--adversarial") {
      mode = "adversarial"
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny verify [--behavioral|--adversarial] [--prompt-only] [feature-name]\n")
      process.stdout.write("\npost-implementation adversary review via gemini.\n")
      process.stdout.write("\nmodes:\n")
      process.stdout.write("  --adversarial  (default) reads full source — finds bugs, security issues\n")
      process.stdout.write("  --behavioral   reads SPEC.md + review artifact — checks behavioral completeness\n")
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
    const result = error({ spec: [{ code: "missing", message: `${paths.spec} does not exist` }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  // -- gather context --

  const project = detect_project_type(root)
  const test_content = collect_test_files(root, project.test_dir)
  const challenge_path = resolve(paths.dir, "challenge.md")

  // run tests and capture output
  const test_result = spawn_sync({ cmd: project.test_cmd.split(" "), cwd: root, label: "test run" })
  const test_output = test_result.ok
    ? `Tests PASS:\n${test_result.stdout}`
    : `Tests FAIL (exit ${test_result.exit_code}):\n${test_result.detail}`

  // -- build prompt (mode-dependent) --

  let sections: { heading: string, content: string }[]
  let instructions: string

  if (mode === "behavioral") {
    // behavioral mode: reads SPEC.md + review artifact, NOT source code.
    // preserves adversarial independence — gemini doesn't see implementation it influenced.
    const spec_md_content = existsSync(paths.spec_md)
      ? readFileSync(paths.spec_md, "utf-8")
      : "(no SPEC.md found)"
    const review_content = existsSync(paths.review)
      ? readFileSync(paths.review, "utf-8")
      : "(no review artifact found)"

    sections = [
      read_section("Feature Specification", paths.spec),
      read_section("Adversary Challenge", challenge_path),
      { heading: "Behavioral Specification (SPEC.md)", content: spec_md_content },
      { heading: "Build Review Artifact", content: review_content },
      { heading: "Test Suite", content: test_content },
      { heading: "Test Results", content: test_output },
    ].filter((s): s is NonNullable<typeof s> => s !== null)

    instructions = [
      "You are the BEHAVIORAL VERIFIER. Your job: confirm the behavioral spec is correct and complete.",
      "You do NOT see the implementation source code. You verify behavior, not code.",
      "",
      "Review:",
      "1. Does SPEC.md cover every behavior described in the feature spec?",
      "2. Does every SPEC.md line have a corresponding test?",
      "3. Are the adversarial tests still present and unmodified?",
      "4. Does the behavioral delta in the review artifact match what was asked for?",
      "5. Are there missing behaviors that should be in SPEC.md but aren't?",
      "6. Are any SPEC.md entries redundant, contradictory, or ambiguous?",
      "",
      "For each finding:",
      "- **Issue**: What behavioral gap or inconsistency was found",
      "- **Severity**: critical / high / medium / low",
      "- **Resolution**: What should be added, changed, or removed",
      "",
      "Do NOT rubber-stamp. A verify that finds zero issues is a failed verify.",
      "",
      "Output ONLY markdown. No preamble or commentary.",
    ].join("\n")
  } else {
    // adversarial mode (default): reads full source — finds bugs, security issues.
    const source_code = collect_source_code(root)

    sections = [
      read_section("Feature Specification", paths.spec),
      read_section("Adversary Challenge", challenge_path),
      { heading: "Test Suite", content: test_content },
      { heading: "Source Code (full implementation)", content: source_code },
      { heading: "Test Results", content: test_output },
    ].filter((s): s is NonNullable<typeof s> => s !== null)

    instructions = [
      "You are the POST-IMPLEMENTATION ADVERSARY. Code has been written. Tests exist.",
      "Your job: find what the tests missed.",
      "",
      "Review:",
      "1. Do tests actually test **behavior**, or just exercise code paths?",
      "2. Are there untested code paths in the implementation?",
      "3. Does the implementation match **spec intent**, not just test assertions?",
      "4. Any security, performance, or correctness issues the tests don't catch?",
      "5. Are property tests actually testing meaningful invariants?",
      "6. Do golden file tests capture the right outputs?",
      "7. Are boundary tests covering the edge cases from the challenge?",
      "",
      "For each finding:",
      "- **Issue**: What was missed",
      "- **Severity**: critical / high / medium / low",
      "- **Suggested Test**: A concrete test case that would catch this",
      "",
      "Do NOT rubber-stamp. If all tests are perfect, look harder.",
      "A verify that finds zero issues is a failed verify.",
      "",
      "Output ONLY markdown. No preamble or commentary.",
    ].join("\n")
  }

  const prompt = build_prompt(sections, instructions)

  // -- prompt-only mode --

  if (prompt_only) {
    const prompt_file = resolve(paths.dir, "verify-prompt.md")
    await Bun.write(prompt_file, prompt)
    const meta = { path: "/bny/verify", timestamp: new Date().toISOString(), duration_ms: 0 }
    process.stdout.write(JSON.stringify(success({ feature: name, prompt_file }, meta), null, 2) + "\n")
    return 0
  }

  // -- shell out to gemini --

  if (!which_check("gemini")) {
    const result = error({ gemini: [{ code: "not_found", message: "gemini CLI not found on PATH — use --prompt-only to generate the prompt file instead" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  process.stderr.write(`[verify:${mode}] post-implementation review for: ${name}\n`)

  const sandbox = create_sandbox(root)
  const model = process.env.BNY_MODEL || null
  const cmd: string[] = ["gemini", "-p", prompt]
  if (model) cmd.push("--model", model)

  const r = await spawn_async({
    cmd,
    cwd: sandbox.cwd,
    env: sandbox.env,
    stdout: "pipe",
    stderr: "inherit",
    assassin_dir: resolve(root, "bny"),
    label: "gemini verify",
  })

  if (!r.ok || !r.stdout) {
    process.stderr.write(`error: gemini verify failed: ${r.detail}\n`)
    return r.exit_code
  }

  // strip preamble and write
  const cleaned = strip_index_preamble(r.stdout) ?? r.stdout.trim()
  const suffix = mode === "behavioral" ? "-behavioral" : ""
  const verify_path = resolve(paths.dir, `verify${suffix}.md`)
  writeFileSync(verify_path, `# Verification (${mode}): ${name}\n\n${cleaned}\n`)

  process.stderr.write(`[verify:${mode}] wrote ${verify_path}\n`)

  const meta = { path: "/bny/verify", timestamp: new Date().toISOString(), duration_ms: 0 }
  process.stdout.write(JSON.stringify(success({ feature: name, verify_file: verify_path }, meta), null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
