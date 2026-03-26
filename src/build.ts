#!/usr/bin/env bun
//
// bny build — the dark factory
//
// full pipeline: specify → challenge → plan → tasks → narrow[1→2→3] → verify → retro
// or run a single step: bny build specify "desc", bny build implement, etc.
//
// narrowing (3×3): 3 rounds of increasingly adversarial tests, each followed
// by implement + retry(max 3). max 9 test runs. each round gets more adversarial
// because gemini sees claude's actual code.
//
// usage:
//   bny build "add user auth"            # full pipeline with description
//   bny build                            # resume current feature (full pipeline)
//   bny build specify "add user auth"    # just specify
//   bny build challenge                  # just challenge
//   bny build plan                       # just plan
//   bny build tasks                      # just tasks
//   bny build narrow                     # just the 3×3 narrowing loop
//   bny build test-gen                   # just test-gen (all layers)
//   bny build implement                  # just implement (all tests)
//   bny build verify                     # just verify
//   bny build ruminate                   # just ruminate
//   bny build --dry-run "add user auth"  # show what would run
//

import { existsSync, readFileSync, writeFileSync, openSync, readSync, closeSync } from "node:fs"
import { resolve } from "node:path"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { read_input } from "./lib/input.ts"
import { ralph } from "./lib/ralph.ts"
import { main as specify_main } from "./specify.ts"
import { main as challenge_main } from "./challenge.ts"
import { main as plan_main } from "./plan.ts"
import { main as tasks_main } from "./tasks.ts"
import { main as testgen_main } from "./test-gen.ts"
// review is absorbed into narrowing rounds 2-3 (gemini reads code, writes targeted tests)
import { main as implement_main } from "./implement.ts"
import { main as verify_main } from "./verify.ts"
import { main as ruminate_main } from "./ruminate.ts"
import { main as retro_main } from "./retro.ts"
import { init_state, update_state, write_state, load_constraints } from "./lib/state.ts"
import type { BuildState } from "./lib/state.ts"

// -- constants --

const STEPS = ["specify", "challenge", "plan", "tasks", "narrow", "verify", "retro", "ruminate"] as const

const NARROW_ROUNDS = [
  { round: 1, label: "contracts" },
  { round: 2, label: "properties" },
  { round: 3, label: "boundaries+golden" },
] as const
type Step = typeof STEPS[number]

const HELP = `usage: bny build [step] [--dry-run] [--interactive] [--max-iter N] [description]

the dark factory. runs the full build pipeline, or a single step.

steps:
  specify "desc"   create feature spec (claude)
  challenge        adversary hardens the spec (gemini)
  plan             create implementation plan (claude)
  tasks            generate task list (claude)
  narrow           3×3 narrowing: test-gen → implement × 3 rounds
  test-gen         generate test suite — all layers (gemini)
  implement        make tests pass (claude)
  verify           post-implementation review (gemini)
  retro            quick retrospective (claude)
  ruminate         deep worldview integration (claude, slow)

narrowing (3×3):
  round 1: contracts        — gemini writes spec-as-code tests
  round 2: properties       — gemini reads claude's code, writes invariants
  round 3: boundaries+golden — gemini targets edge cases in the actual code
  each round: implement with max 3 retries. max 9 test runs total.

flags:
  --dry-run          show what would run, don't execute
  --interactive, -i  pause for human review at checkpoints
  --max-iter N       max retries per narrowing round (default: 3)

examples:
  bny build "add user auth"          # full pipeline with narrowing
  bny build                          # resume current feature
  bny build specify "add user auth"  # just specify
  bny build narrow                   # just the 3×3 narrowing loop
  bny build test-gen                 # test-gen only (all layers)
  bny build implement                # implement only

input:
  <text...>              inline text
  -                      read from stdin
  --input <path>         read from file
`

// -- main --

export async function main(argv: string[]): Promise<number> {
  // -- read_input: handle --input <path> and stdin (-) --

  const { text: input_text, rest_argv } = read_input(argv)

  // -- parse args --

  let step: Step | null = null
  let dry_run = false
  let interactive = false
  let max_iter = 3
  const positional: string[] = []

  for (let i = 0; i < rest_argv.length; i++) {
    const arg = rest_argv[i]

    if (arg === "--help" || arg === "-h") {
      process.stdout.write(HELP)
      return 0
    } else if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--interactive" || arg === "-i") {
      interactive = true
    } else if (arg === "--max-iter" && rest_argv[i + 1]) {
      const val = parseInt(rest_argv[i + 1], 10)
      if (!isNaN(val) && val > 0) max_iter = val
      i++
    } else if (!arg.startsWith("-")) {
      // first positional: check if it's a step name
      // also accept test-gen/implement as single-step aliases (backward compat)
      const SINGLE_STEP_ALIASES = ["test-gen", "implement", "review"] as const
      type Alias = typeof SINGLE_STEP_ALIASES[number]
      const is_step = STEPS.includes(arg as Step)
      const is_alias = (SINGLE_STEP_ALIASES as readonly string[]).includes(arg)
      if (positional.length === 0 && (is_step || is_alias)) {
        step = arg as Step | Alias as any
      } else {
        positional.push(arg)
      }
    }
  }

  const description = input_text ?? positional.join(" ").trim()
  const root = find_root()

  // -- single step mode --

  if (step) {
    return run_step(step, description, root, { dry_run, interactive, max_iter })
  }

  // -- full pipeline mode --

  return run_pipeline(description, root, { dry_run, interactive, max_iter })
}

// -- step runner --

interface Opts {
  dry_run:     boolean
  interactive: boolean
  max_iter:    number
}

async function run_step(
  step: string, description: string, root: string, opts: Opts
): Promise<number> {
  if (opts.dry_run) {
    process.stderr.write(`[bny build] dry-run: would run step '${step}'\n`)
    if (description) process.stderr.write(`  description: ${description}\n`)
    return 0
  }

  switch (step) {
    case "specify": {
      if (!description) {
        process.stderr.write("error: bny build specify requires a description\n")
        return 1
      }
      return specify_main([description])
    }
    case "challenge":
      return challenge_main(description ? [description] : [])
    case "plan":
      return plan_main(description ? [description] : [])
    case "tasks":
      return tasks_main(description ? [description] : [])
    case "narrow":
      return run_narrowing(root, opts)
    case "test-gen":
      // backward compat: single-step test-gen generates all layers
      return testgen_main(description ? [description] : [])
    case "implement":
      // backward compat: single-step implement runs all tests
      return implement_main(description ? [description] : [])
    case "review":
      // backward compat: review is now absorbed into narrowing rounds 2-3
      process.stderr.write("note: review is now part of narrowing rounds 2-3\n")
      process.stderr.write("  use 'bny build narrow' instead\n")
      return 0
    case "verify":
      return verify_main(description ? [description] : [])
    case "retro":
      return retro_main(description ? [description] : [])
    case "ruminate": {
      const args: string[] = []
      if (!opts.interactive) args.push("--yes")
      if (description) args.push(description)
      return ruminate_main(args)
    }
    default:
      process.stderr.write(`error: unknown step '${step}'\n`)
      return 1
  }
}

// -- narrowing loop --

async function run_narrowing(root: string, opts: Opts, on_step?: (step: string, status: string, round: number) => void): Promise<number> {
  process.stderr.write(`\n--- narrow 3×3 (max-iter ${opts.max_iter} per round) ---\n`)

  for (const { round, label } of NARROW_ROUNDS) {
    // test-gen for this round
    on_step?.(`test-gen:${label}`, "in_progress", round)
    process.stderr.write(`\n--- test-gen:${label} (gemini, round ${round}) ---\n`)
    const tg_code = await testgen_main(["--round", String(round)])
    if (tg_code !== 0) {
      on_step?.(`test-gen:${label}`, "failed", round)
      process.stderr.write(`warning: test-gen:${label} failed (exit ${tg_code}), skipping round\n`)
      continue
    }
    on_step?.(`test-gen:${label}`, "completed", round)

    // implement with retries
    on_step?.(`implement:${label}`, "in_progress", round)
    process.stderr.write(`\n--- implement:${label} (claude, ralph, max-iter ${opts.max_iter}) ---\n`)
    const result = await ralph({
      fn:         () => implement_main(["--round", String(round)]),
      max_iter:   opts.max_iter,
      max_budget: 0,
      timeout_ms: 0,
      session_id: null,
    })

    if (result.status !== "complete") {
      on_step?.(`implement:${label}`, "failed", round)
      process.stderr.write(`\nerror: implement:${label} ${result.status} after ${result.iterations} iterations\n`)
      return 1
    }
    on_step?.(`implement:${label}`, "completed", round)

    process.stderr.write(`\n--- round ${round} (${label}) complete ---\n`)
  }

  return 0
}

// -- full pipeline --

async function run_pipeline(
  description: string, root: string, opts: Opts
): Promise<number> {
  // determine if we need to specify or resume
  const feature = current_feature()
  const need_specify = !feature && description.length > 0

  if (!feature && !description) {
    process.stderr.write("error: no current feature and no description given\n")
    process.stderr.write("usage: bny build \"description\" or checkout a feature branch\n")
    return 1
  }

  const label = description || feature || "unknown"
  process.stderr.write(`\n[bny build] ${label}\n`)
  process.stderr.write(`  max-iter: ${opts.max_iter}\n\n`)

  // -- durable state --
  let build_state = init_state({
    feature: feature || description,
    description,
    pipeline: "build",
    constraints: load_constraints(root),
  })
  write_state(root, build_state)

  if (opts.dry_run) {
    process.stderr.write(`would run:\n`)
    if (need_specify) {
      process.stderr.write(`  1. specify "${description}" (claude)\n`)
    } else {
      process.stderr.write(`  1. (skip specify — feature exists: ${feature})\n`)
    }
    process.stderr.write(`  2. challenge (gemini)\n`)
    process.stderr.write(`  3. plan (claude)\n`)
    process.stderr.write(`  4. tasks (claude)\n`)
    process.stderr.write(`  5. narrow 3×3 (max-iter ${opts.max_iter} per round):\n`)
    for (const { round, label } of NARROW_ROUNDS) {
      process.stderr.write(`     ${round}a. test-gen:${label} (gemini)\n`)
      process.stderr.write(`     ${round}b. implement:${label} (claude, ralph)\n`)
    }
    process.stderr.write(`  6. verify (gemini)\n`)
    process.stderr.write(`  7. retro (claude)\n`)
    return 0
  }

  // -- helpers --

  async function run_fn(fn: () => Promise<number>, step_label: string): Promise<boolean> {
    build_state = update_state(build_state, step_label, "in_progress")
    write_state(root, build_state)

    process.stderr.write(`\n--- ${step_label} ---\n`)
    const code = await fn()

    build_state = update_state(build_state, step_label, code === 0 ? "completed" : "failed")
    write_state(root, build_state)

    if (code !== 0) {
      process.stderr.write(`\nerror: ${step_label} failed (exit ${code})\n`)
      return false
    }
    return true
  }

  function confirm(prompt: string): boolean {
    if (!opts.interactive) return true
    process.stderr.write(prompt)
    const buf = Buffer.alloc(64)
    let fd: number | null = null
    try {
      fd = openSync("/dev/tty", "r")
      const n = readSync(fd, buf, 0, 64, null)
      const answer = buf.slice(0, n).toString().trim().toLowerCase()
      return answer === "" || answer === "y" || answer === "yes"
    } catch {
      process.stderr.write("warning: could not read /dev/tty, defaulting to no\n")
      return false // safe default
    } finally {
      if (fd !== null) closeSync(fd)
    }
  }

  const warnings: string[] = []

  // -- 1. specify (claude) --

  if (need_specify) {
    if (!await run_fn(() => specify_main([description]), "specify")) {
      return 1
    }

    // human reviews spec
    if (opts.interactive) {
      const feat = current_feature()
      if (feat) {
        const paths = feature_paths(root, feat)
        process.stderr.write(`\n--- review spec ---\n`)
        process.stderr.write(`spec: ${paths.spec}\n`)
        process.stderr.write(`\nreview the spec, edit if needed.\n`)
        if (!confirm("continue? [Y/n] ")) {
          process.stderr.write("aborted\n")
          return 0
        }
      }
    }
  } else {
    process.stderr.write(`\n--- skip specify (feature: ${feature}) ---\n`)
  }

  // -- 2. challenge (gemini) --

  if (!await run_fn(() => challenge_main([]), "challenge (gemini)")) {
    process.stderr.write("warning: challenge failed, continuing without spec hardening\n")
    warnings.push("challenge")
    build_state = { ...build_state, warnings: [...build_state.warnings, "challenge"] }
  }

  // -- 3. plan (claude) --

  if (!await run_fn(() => plan_main([]), "plan")) {
    return 1
  }

  // -- 4. tasks (claude) --

  if (!await run_fn(() => tasks_main([]), "tasks")) {
    return 1
  }

  // -- 5. narrow (3×3: test-gen → implement × 3 rounds) --

  build_state = update_state(build_state, "narrow", "in_progress")
  write_state(root, build_state)

  const narrow_code = await run_narrowing(root, opts, (step, status, round) => {
    build_state = update_state(build_state, step, status, round)
    write_state(root, build_state)
  })
  if (narrow_code !== 0) {
    build_state = update_state(build_state, "narrow", "failed")
    write_state(root, build_state)
    if (!confirm("narrowing did not complete cleanly. continue anyway? [y/N] ")) {
      process.stderr.write("stopped at narrow\n")
      return 1
    }
    warnings.push("narrow")
    build_state = { ...build_state, warnings: [...build_state.warnings, "narrow"] }
  } else {
    build_state = update_state(build_state, "narrow", "completed")
    write_state(root, build_state)
  }

  // -- 6. verify (gemini) --

  if (!await run_fn(() => verify_main([]), "verify (gemini)")) {
    process.stderr.write("warning: verify failed, continuing...\n")
    warnings.push("verify")
    build_state = { ...build_state, warnings: [...build_state.warnings, "verify"] }
  }

  // -- 7. retro (claude — quick retrospective) --

  if (!await run_fn(() => retro_main([]), "retro")) {
    process.stderr.write("warning: retro failed, continuing...\n")
    warnings.push("retro")
    build_state = { ...build_state, warnings: [...build_state.warnings, "retro"] }
  }

  // -- done --

  if (warnings.length > 0) {
    process.stderr.write(`\n[bny build] complete with warnings: ${warnings.join(", ")}\n`)
    process.stderr.write(`  ${label}\n`)
    return 2
  }

  process.stderr.write(`\n[bny build] complete: ${label}\n`)
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
