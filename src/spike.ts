#!/usr/bin/env bun
//
// bny spike — exploratory build, guardrails off
//
// same 4-phase pipeline as bny hop but guardrails off:
// no human checkpoints, no roadmap required, all failures non-fatal.
// output is explicitly disposable — but the brane still learns from it.
//
// usage:
//   bny spike "prototype oauth flow"     # full pipeline, no review
//   bny spike --dry-run "topic"          # show what would run
//

import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { find_root, current_feature } from "./lib/feature.ts"
import { read_input } from "./lib/input.ts"
import { run_spec } from "./spec.ts"
import { run_plan_phase } from "./plan-phase.ts"
import { run_test_phase } from "./test-phase.ts"
import { run_build_phase } from "./build-phase.ts"
import { init_state, update_state, write_state, load_constraints } from "./lib/state.ts"

// -- help --

const HELP = `usage: bny spike [--dry-run] [--max-iter N] <description>

exploratory build. same 4-phase pipeline as bny hop but guardrails off:
  - no human checkpoints
  - no roadmap required
  - all failures non-fatal (keeps going)
  - output is disposable — but the brane still learns

phases:
  1. spec     specify (claude) + challenge (gemini)
  2. plan     plan (claude) + tasks (claude)
  3. test     3×3 narrowing (gemini + claude)
  4. build    implement + verify + retro + ruminate

flags:
  --dry-run        show what would run, don't execute
  --max-iter N     ralph iterations per narrowing round (default: 3)

input:
  <text...>              inline text
  -                      read from stdin
  --input <path>         read from file

examples:
  bny spike "prototype oauth"            # full pipeline, no review
  bny --effort some spike "websockets"   # with retries
`

// -- main --

export async function main(argv: string[]): Promise<number> {
  const { text: input_text, rest_argv } = read_input(argv)

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
      positional.push(arg)
    }
  }

  const description = input_text ?? positional.join(" ").trim()
  const root = find_root()

  const feature = current_feature()
  const need_spec = !feature && description.length > 0

  if (!feature && !description) {
    process.stderr.write("error: no current feature and no description given\n")
    process.stderr.write("usage: bny spike \"description\" or checkout a feature branch\n")
    return 1
  }

  const label = description || feature || "unknown"
  process.stderr.write(`\n[bny spike] ${label}\n`)
  process.stderr.write(`  max-iter: ${max_iter}\n`)
  process.stderr.write(`  guardrails: off\n\n`)

  if (dry_run) {
    if (need_spec) {
      process.stderr.write(`  phase 1 (spec): specify + challenge\n`)
    } else {
      process.stderr.write(`  phase 1 (spec): skip — feature exists: ${feature}\n`)
    }
    process.stderr.write(`  phase 2 (plan): plan + tasks\n`)
    process.stderr.write(`  phase 3 (test): 3×3 narrowing (max-iter ${max_iter})\n`)
    process.stderr.write(`  phase 4 (build): implement + verify + retro + ruminate\n`)
    return 0
  }

  // -- durable state --
  let state = init_state({
    feature: feature || description,
    description,
    pipeline: "spike",
    constraints: load_constraints(root),
  })
  write_state(root, state)

  // ==========================================
  // PHASE 1: SPEC (all failures non-fatal in spikes)
  // ==========================================

  if (need_spec) {
    state = update_state(state, "spec", "in_progress")
    write_state(root, state)

    process.stderr.write(`\n=== phase 1: spec ===\n`)
    const spec_code = await run_spec(description, root, { mode: "auto", interactive: false })
    if (spec_code !== 0) {
      state = update_state(state, "spec", "failed")
      write_state(root, state)
      // fatal even for spikes — can't continue without a spec
      return 1
    }
    state = update_state(state, "spec", "completed")
    write_state(root, state)
  } else {
    process.stderr.write(`\n=== phase 1: spec (skip — feature: ${feature}) ===\n`)
  }

  // ==========================================
  // PHASE 2: PLAN
  // ==========================================

  state = update_state(state, "plan", "in_progress")
  write_state(root, state)

  process.stderr.write(`\n=== phase 2: plan ===\n`)
  const plan_code = await run_plan_phase([])
  if (plan_code !== 0) {
    state = update_state(state, "plan", "failed")
    write_state(root, state)
    // fatal even for spikes — need a plan to generate tests
    return 1
  }
  state = update_state(state, "plan", "completed")
  write_state(root, state)

  // ==========================================
  // PHASE 3: TEST (non-fatal in spikes)
  // ==========================================

  state = update_state(state, "test", "in_progress")
  write_state(root, state)

  process.stderr.write(`\n=== phase 3: test ===\n`)
  const test_code = await run_test_phase(root, {
    max_iter,
    on_step: (step, status, round) => {
      state = update_state(state, step, status, round)
      write_state(root, state)
    },
  })

  if (test_code !== 0) {
    state = update_state(state, "test", "failed")
    write_state(root, state)
    process.stderr.write("warning: test phase failed, continuing (spike mode)...\n")
  } else {
    state = update_state(state, "test", "completed")
    write_state(root, state)
  }

  // ==========================================
  // PHASE 4: BUILD (non-fatal in spikes)
  // ==========================================

  state = update_state(state, "build", "in_progress")
  write_state(root, state)

  process.stderr.write(`\n=== phase 4: build ===\n`)
  const build_code = await run_build_phase(root, { max_iter })
  if (build_code !== 0) {
    state = update_state(state, "build", "failed")
    write_state(root, state)
    process.stderr.write("warning: build phase failed (spike mode)\n")
  } else {
    state = update_state(state, "build", "completed")
    write_state(root, state)
  }

  // -- done --

  process.stderr.write(`\n[bny spike] complete: ${label}\n`)
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
