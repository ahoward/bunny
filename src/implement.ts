#!/usr/bin/env bun
//
// bny implement — drive AI implementation via claude
//
// shells out to claude with a prompt built from spec/plan/tasks.
// single-pass execution; use `bny --ralph implement` for retry loops.
//
// usage:
//   bny implement                              # current feature branch
//   bny implement 001-auth                     # explicit feature
//   bny --ralph --max-iter 10 implement        # with retry loop
//

import { existsSync, unlinkSync } from "node:fs"
import { resolve } from "node:path"
import { error } from "./lib/result.ts"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { read_section, build_prompt } from "./lib/prompt.ts"
import { spawn_async, which_check } from "./lib/spawn.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  let target: string | null = null
  let round = 0  // 0 = no round (all tests)

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny implement [--round 1|2|3] [feature-name]\n")
      process.stdout.write("\nshells out to claude -p with a prompt built from spec/plan/tasks.\n")
      process.stdout.write("use bny --ralph --max-iter N implement for retry loops.\n")
      process.stdout.write("\nrounds (narrowing):\n")
      process.stdout.write("  --round 1    build foundation — make contract tests pass\n")
      process.stdout.write("  --round 2    make property tests pass without breaking contracts\n")
      process.stdout.write("  --round 3    make boundary tests pass without breaking anything\n")
      return 0
    } else if (arg === "--round" && argv[i + 1]) {
      round = parseInt(argv[i + 1], 10)
      i++
    } else if (!arg.startsWith("-")) {
      target = arg
    }
  }

  // -- resolve feature --

  const root = find_root()
  const name = target || current_feature()

  if (!name) {
    const result = error({ feature: [{ code: "not_found", message: "no feature specified and not on a feature branch" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  const paths = feature_paths(root, name)

  // -- guards --

  if (!existsSync(paths.tasks)) {
    const result = error({ tasks: [{ code: "missing", message: `${paths.tasks} does not exist — run bny tasks first` }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  if (!which_check("claude")) {
    const result = error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  // -- build prompt --

  const protocol_path = resolve(root, "AGENTS.md")

  const sections = [
    read_section("Agent Protocol", protocol_path),
    read_section("Feature Specification", paths.spec),
    read_section("Implementation Plan", paths.plan),
    read_section("Task List", paths.tasks),
  ].filter((s): s is NonNullable<typeof s> => s !== null)

  const round_instructions = round === 1 ? [
    "## Round 1: Contract Tests",
    "",
    "Contract tests exist in the test directory, written by the antagonist agent.",
    "Your job: build the foundation. Make ALL contract tests pass.",
    "Focus on the happy path — get the API shape right.",
  ] : round === 2 ? [
    "## Round 2: Property Tests",
    "",
    "New property tests have been added by the antagonist agent.",
    "Contract tests are ALREADY PASSING — do NOT break them.",
    "Your job: make the new property tests pass without breaking contracts.",
    "Focus on behavioral correctness — the properties test invariants the contracts missed.",
  ] : round === 3 ? [
    "## Round 3: Boundary + Golden File Tests",
    "",
    "New boundary and golden file tests have been added by the antagonist agent.",
    "Contract and property tests are ALREADY PASSING — do NOT break them.",
    "Your job: make the new boundary/golden tests pass without breaking anything.",
    "Focus on edge cases and hardening — these tests target where your code is weakest.",
  ] : [
    "Tests already exist in the test directory, written by the antagonist agent.",
    "Your job: make ALL tests pass by implementing the code.",
  ]

  const instructions = [
    ...round_instructions,
    "",
    "Work through the implementation tasks in the task list above, in order.",
    "After each code change, run `./dev/test`.",
    "Do NOT modify test files — they are locked by the antagonist.",
    "If a test seems wrong, note it but implement to make it pass anyway.",
    "Mark tasks as [x] in tasks.md as you complete them.",
    "If you get stuck on a task after 3 attempts, stop and report the blocker.",
    "Do not move to the next task until the current one passes tests.",
    "Before committing, run `./dev/post_flight`.",
  ].join("\n")

  const prompt = build_prompt(sections, instructions)

  // -- shell out to claude --

  const prompt_tmp = resolve(root, `bny/implement-prompt-${process.pid}.tmp`)
  await Bun.write(prompt_tmp, prompt)

  // model version pinning — array spawn, no shell interpolation
  const model = process.env.BNY_MODEL || null
  const cmd: string[] = ["claude", "-p", "--continue", "--dangerously-skip-permissions"]
  if (model) cmd.push("--model", model)

  const r = await spawn_async({
    cmd,
    cwd: root,
    stdin: Bun.file(prompt_tmp),
    stdout: "inherit",
    stderr: "inherit",
    assassin_dir: resolve(root, "bny"),
    label: "claude implement",
  })

  try { unlinkSync(prompt_tmp) } catch {}

  return r.exit_code
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
