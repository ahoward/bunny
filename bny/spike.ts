#!/usr/bin/env bun
//
// bny spike — exploratory build, guardrails off
//
// same interface as bny build, but: no gemini review, no locked tests,
// no spec-first requirement. output is explicitly disposable —
// but the brane still learns from it.
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
import { ralph } from "./lib/ralph.ts"
import { main as specify_main } from "./specify.ts"
import { main as plan_main } from "./plan.ts"
import { main as tasks_main } from "./tasks.ts"
import { main as implement_main } from "./implement.ts"
import { main as ruminate_main } from "./ruminate.ts"

// -- constants --

const STEPS = ["specify", "plan", "tasks", "implement", "ruminate"] as const
type Step = typeof STEPS[number]

const HELP = `usage: bny spike [step] [--dry-run] [--max-iter N] [description]

exploratory build. same as bny build but guardrails off:
  - no gemini review
  - no test-first requirement
  - no locked specs
  - output is disposable — but the brane still learns

steps:
  specify "desc"   create feature spec
  plan             create implementation plan
  tasks            generate task list
  implement        claude builds it
  ruminate         reflect on build, feed brane

flags:
  --dry-run        show what would run, don't execute
  --max-iter N     ralph iterations for implement (default: 3)

examples:
  bny spike "prototype oauth"            # full pipeline, no review
  bny spike implement                    # just implement, fast
  bny --effort some spike "websockets"   # with retries
`

// -- main --

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  let step: Step | null = null
  let dry_run = false
  let max_iter = 3 // lower default for spikes — fast and loose
  const positional: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === "--help" || arg === "-h") {
      process.stdout.write(HELP)
      return 0
    } else if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--max-iter" && argv[i + 1]) {
      const val = parseInt(argv[i + 1], 10)
      if (!isNaN(val) && val > 0) max_iter = val
      i++
    } else if (!arg.startsWith("-")) {
      if (positional.length === 0 && STEPS.includes(arg as Step)) {
        step = arg as Step
      } else {
        positional.push(arg)
      }
    }
  }

  const description = positional.join(" ").trim()
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
  step: Step, description: string, root: string, opts: Opts
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
    case "plan":
      return plan_main(description ? [description] : [])
    case "tasks":
      return tasks_main(description ? [description] : [])
    case "implement":
      return implement_main(description ? [description] : [])
    case "ruminate":
      // spikes auto-yes ruminate — knowledge is never disposable
      return ruminate_main(["--yes", ...(description ? [description] : [])])
  }
}

// -- full pipeline (no review step) --

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

  if (opts.dry_run) {
    process.stderr.write(`would run:\n`)
    if (need_specify) {
      process.stderr.write(`  1. specify "${description}"\n`)
    } else {
      process.stderr.write(`  1. (skip specify — feature exists: ${feature})\n`)
    }
    process.stderr.write(`  2. plan\n`)
    process.stderr.write(`  3. tasks\n`)
    process.stderr.write(`  4. (skip review — spike mode)\n`)
    process.stderr.write(`  5. implement (ralph, max-iter ${opts.max_iter})\n`)
    process.stderr.write(`  6. ruminate (auto-yes)\n`)
    return 0
  }

  // -- helpers --

  async function run_fn(fn: () => Promise<number>, step_label: string): Promise<boolean> {
    process.stderr.write(`\n--- ${step_label} ---\n`)
    const code = await fn()
    if (code !== 0) {
      process.stderr.write(`\nerror: ${step_label} failed (exit ${code})\n`)
      return false
    }
    return true
  }

  // -- 1. specify --

  if (need_specify) {
    if (!await run_fn(() => specify_main([description]), "specify")) {
      return 1
    }
  } else {
    process.stderr.write(`\n--- skip specify (feature: ${feature}) ---\n`)
  }

  // -- 2. plan --

  if (!await run_fn(() => plan_main([]), "plan")) {
    return 1
  }

  // -- 3. tasks --

  if (!await run_fn(() => tasks_main([]), "tasks")) {
    return 1
  }

  // -- 4. skip review (spike mode) --

  process.stderr.write(`\n--- skip review (spike mode) ---\n`)

  // -- 5. implement --

  process.stderr.write(`\n--- implement (ralph, max-iter ${opts.max_iter}) ---\n`)
  const impl_result = await ralph({
    fn:         () => implement_main([]),
    max_iter:   opts.max_iter,
    max_budget: 0,
    timeout_ms: 0,
    session_id: null,
  })

  if (impl_result.status !== "complete") {
    process.stderr.write(`\nwarning: implement ${impl_result.status} after ${impl_result.iterations} iterations\n`)
    // spikes don't stop on implement failure — keep going
  }

  // -- 6. ruminate (always, auto-yes — knowledge is never disposable) --

  if (!await run_fn(() => ruminate_main(["--yes"]), "ruminate")) {
    process.stderr.write("warning: ruminate failed\n")
  }

  // -- done --

  process.stderr.write(`\n[bny spike] complete: ${label}\n`)
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
