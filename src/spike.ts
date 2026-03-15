#!/usr/bin/env bun
//
// bny spike — exploratory build, guardrails off
//
// same pipeline as bny build but guardrails off:
// no human checkpoints, no roadmap required, all failures non-fatal.
// output is explicitly disposable — but the brane still learns from it.
//
// usage:
//   bny spike "prototype oauth flow"     # full pipeline, no review
//   bny spike implement                  # just implement, fast
//   bny spike specify "websocket layer"  # create spec (no review later)
//   bny spike --dry-run "topic"          # show what would run
//

import { existsSync, openSync, readSync, closeSync } from "node:fs"
import { resolve } from "node:path"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { read_input } from "./lib/input.ts"
import { ralph } from "./lib/ralph.ts"
import { main as specify_main } from "./specify.ts"
import { main as challenge_main } from "./challenge.ts"
import { main as plan_main } from "./plan.ts"
import { main as tasks_main } from "./tasks.ts"
import { main as testgen_main } from "./test-gen.ts"
// review is absorbed into narrowing rounds 2-3
import { main as implement_main } from "./implement.ts"
import { main as verify_main } from "./verify.ts"
import { main as ruminate_main } from "./ruminate.ts"
import { init_state, update_state, write_state, load_constraints } from "./lib/state.ts"

// -- constants --

const STEPS = ["specify", "challenge", "plan", "tasks", "narrow", "verify", "ruminate"] as const

const NARROW_ROUNDS = [
  { round: 1, label: "contracts" },
  { round: 2, label: "properties" },
  { round: 3, label: "boundaries+golden" },
] as const
type Step = typeof STEPS[number]

const HELP = `usage: bny spike [step] [--dry-run] [--max-iter N] [description]

exploratory build. same pipeline as bny build but guardrails off:
  - no human checkpoints
  - no roadmap required
  - all failures non-fatal (keeps going)
  - output is disposable — but the brane still learns

steps:
  specify "desc"   create feature spec (claude)
  challenge        adversary hardens spec (gemini)
  plan             create implementation plan (claude)
  tasks            generate task list (claude)
  narrow           3×3 narrowing: test-gen → implement × 3 rounds
  test-gen         generate test suite — all layers (gemini)
  implement        make tests pass (claude)
  verify           post-implementation review (gemini)
  ruminate         reflect on build, feed brane (claude)

flags:
  --dry-run        show what would run, don't execute
  --max-iter N     ralph iterations per narrowing round (default: 3)

examples:
  bny spike "prototype oauth"            # full pipeline, no review
  bny spike implement                    # just implement, fast
  bny --effort some spike "websockets"   # with retries

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
  let max_iter = 3 // lower default for spikes — fast and loose
  const positional: string[] = []

  for (let i = 0; i < rest_argv.length; i++) {
    const arg = rest_argv[i]

    if (arg === "--help" || arg === "-h") {
      process.stdout.write(HELP)
      return 0
    } else if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--max-iter" && rest_argv[i + 1]) {
      const val = parseInt(rest_argv[i + 1], 10)
      if (!isNaN(val) && val > 0) max_iter = val
      i++
    } else if (!arg.startsWith("-")) {
      const ALIASES = ["test-gen", "implement", "review"] as const
      const is_step = STEPS.includes(arg as Step)
      const is_alias = (ALIASES as readonly string[]).includes(arg)
      if (positional.length === 0 && (is_step || is_alias)) {
        step = arg as any
      } else {
        positional.push(arg)
      }
    }
  }

  const description = input_text ?? positional.join(" ").trim()
  const root = find_root()

  // -- single step mode --

  if (step) {
    return run_step(step, description, root, { dry_run, max_iter })
  }

  // -- full pipeline mode --

  return run_pipeline(description, root, { dry_run, max_iter })
}

// -- step runner --

interface Opts {
  dry_run:  boolean
  max_iter: number
}

async function run_step(
  step: string, description: string, root: string, opts: Opts
): Promise<number> {
  if (opts.dry_run) {
    process.stderr.write(`[bny spike] dry-run: would run step '${step}'\n`)
    if (description) process.stderr.write(`  description: ${description}\n`)
    return 0
  }

  switch (step) {
    case "specify": {
      if (!description) {
        process.stderr.write("error: bny spike specify requires a description\n")
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
      return testgen_main(description ? [description] : [])
    case "implement":
      return implement_main(description ? [description] : [])
    case "review":
      process.stderr.write("note: review is now part of narrowing rounds 2-3\n")
      return 0
    case "verify":
      return verify_main(description ? [description] : [])
    case "ruminate":
      // spikes auto-yes ruminate — knowledge is never disposable
      return ruminate_main(["--yes", ...(description ? [description] : [])])
    default:
      process.stderr.write(`error: unknown step '${step}'\n`)
      return 1
  }
}

// -- narrowing loop (all failures non-fatal in spikes) --

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
      process.stderr.write(`warning: implement:${label} ${result.status} after ${result.iterations} iterations\n`)
      // spikes don't stop — keep going to next round
    } else {
      on_step?.(`implement:${label}`, "completed", round)
    }

    process.stderr.write(`\n--- round ${round} (${label}) complete ---\n`)
  }

  return 0
}

// -- full pipeline (all failures non-fatal) --

async function run_pipeline(
  description: string, root: string, opts: Opts
): Promise<number> {
  const feature = current_feature()
  const need_specify = !feature && description.length > 0

  if (!feature && !description) {
    process.stderr.write("error: no current feature and no description given\n")
    process.stderr.write("usage: bny spike \"description\" or checkout a feature branch\n")
    return 1
  }

  const label = description || feature || "unknown"
  process.stderr.write(`\n[bny spike] ${label}\n`)
  process.stderr.write(`  max-iter: ${opts.max_iter}\n`)
  process.stderr.write(`  guardrails: off\n\n`)

  // -- durable state --
  let build_state = init_state({
    feature: feature || description,
    description,
    pipeline: "spike",
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
    process.stderr.write(`  7. ruminate (claude, auto-yes)\n`)
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

  // -- 1. specify (claude) --

  if (need_specify) {
    if (!await run_fn(() => specify_main([description]), "specify")) {
      return 1
    }
  } else {
    process.stderr.write(`\n--- skip specify (feature: ${feature}) ---\n`)
  }

  // -- 2. challenge (gemini) --

  if (!await run_fn(() => challenge_main([]), "challenge (gemini)")) {
    process.stderr.write("warning: challenge failed, continuing...\n")
  }

  // -- 3. plan (claude) --

  if (!await run_fn(() => plan_main([]), "plan")) {
    return 1
  }

  // -- 4. tasks (claude) --

  if (!await run_fn(() => tasks_main([]), "tasks")) {
    return 1
  }

  // -- 5. narrow (3×3: test-gen → implement × 3 rounds, all non-fatal) --

  build_state = update_state(build_state, "narrow", "in_progress")
  write_state(root, build_state)

  const narrow_code = await run_narrowing(root, opts, (step, status, round) => {
    build_state = update_state(build_state, step, status, round)
    write_state(root, build_state)
  })

  build_state = update_state(build_state, "narrow", narrow_code === 0 ? "completed" : "failed")
  write_state(root, build_state)

  if (narrow_code !== 0) {
    process.stderr.write("warning: narrowing did not complete cleanly, continuing...\n")
  }

  // -- 6. verify (gemini) --

  if (!await run_fn(() => verify_main([]), "verify (gemini)")) {
    process.stderr.write("warning: verify failed, continuing...\n")
  }

  // -- 7. ruminate (claude, auto-yes — knowledge is never disposable) --

  if (!await run_fn(() => ruminate_main(["--yes"]), "ruminate")) {
    process.stderr.write("warning: ruminate failed\n")
  }

  // -- done --

  process.stderr.write(`\n[bny spike] complete: ${label}\n`)
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
