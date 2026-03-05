#!/usr/bin/env bun
//
// bny build — the dark factory
//
// full pipeline: specify → challenge → plan → tasks → test-gen →
//                review → implement → verify → ruminate
// or run a single step: bny build specify "desc", bny build implement, etc.
//
// usage:
//   bny build "add user auth"            # full pipeline with description
//   bny build                            # resume current feature (full pipeline)
//   bny build specify "add user auth"    # just specify
//   bny build challenge                  # just challenge
//   bny build plan                       # just plan
//   bny build tasks                      # just tasks
//   bny build test-gen                   # just test-gen
//   bny build review                     # just review
//   bny build implement                  # just implement
//   bny build verify                     # just verify
//   bny build ruminate                   # just ruminate
//   bny build --dry-run "add user auth"  # show what would run
//

import { existsSync, readFileSync, writeFileSync, openSync, readSync, closeSync } from "node:fs"
import { resolve } from "node:path"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { ralph } from "./lib/ralph.ts"
import { main as specify_main } from "./specify.ts"
import { main as challenge_main } from "./challenge.ts"
import { main as plan_main } from "./plan.ts"
import { main as tasks_main } from "./tasks.ts"
import { main as testgen_main } from "./test-gen.ts"
import { main as review_main } from "./review.ts"
import { main as implement_main } from "./implement.ts"
import { main as verify_main } from "./verify.ts"
import { main as ruminate_main } from "./ruminate.ts"

// -- constants --

const STEPS = ["specify", "challenge", "plan", "tasks", "test-gen", "review", "implement", "verify", "ruminate"] as const
type Step = typeof STEPS[number]

const HELP = `usage: bny build [step] [--dry-run] [--interactive] [--max-iter N] [description]

the dark factory. runs the full build pipeline, or a single step.

steps:
  specify "desc"   create feature spec (claude)
  challenge        adversary hardens the spec (gemini)
  plan             create implementation plan (claude)
  tasks            generate task list (claude)
  test-gen         generate test suite from spec (gemini)
  review           antagonist review (gemini)
  implement        make tests pass (claude)
  verify           post-implementation review (gemini)
  ruminate         reflect on build, feed brane (claude)

flags:
  --dry-run          show what would run, don't execute
  --interactive, -i  pause for human review at checkpoints
  --max-iter N       ralph iterations for implement (default: 5)

examples:
  bny build "add user auth"          # full pipeline
  bny build                          # resume current feature
  bny build specify "add user auth"  # just specify
  bny build implement                # just implement
  bny --effort full build            # full pipeline, 10 retries
`

// -- main --

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  let step: Step | null = null
  let dry_run = false
  let interactive = false
  let max_iter = 5
  const positional: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === "--help" || arg === "-h") {
      process.stdout.write(HELP)
      return 0
    } else if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--interactive" || arg === "-i") {
      interactive = true
    } else if (arg === "--max-iter" && argv[i + 1]) {
      const val = parseInt(argv[i + 1], 10)
      if (!isNaN(val) && val > 0) max_iter = val
      i++
    } else if (!arg.startsWith("-")) {
      // first positional: check if it's a step name
      if (positional.length === 0 && STEPS.includes(arg as Step)) {
        step = arg as Step
      } else {
        positional.push(arg)
      }
    }
  }

  const description = positional.join(" ").trim()
  const root = find_root()

  // guard: build requires a roadmap — use bny spike for ad-hoc builds
  const roadmap_path = resolve(root, "bny/roadmap.md")
  if (!existsSync(roadmap_path)) {
    process.stderr.write("error: no bny/roadmap.md found — bny build requires a roadmap\n")
    process.stderr.write("  use 'bny spike \"description\"' for ad-hoc builds\n")
    return 1
  }

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
  step: Step, description: string, root: string, opts: Opts
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
    case "test-gen":
      return testgen_main(description ? [description] : [])
    case "review":
      return review_main([])
    case "implement":
      return implement_main(description ? [description] : [])
    case "verify":
      return verify_main(description ? [description] : [])
    case "ruminate": {
      const args: string[] = []
      if (!opts.interactive) args.push("--yes")
      if (description) args.push(description)
      return ruminate_main(args)
    }
  }
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
    process.stderr.write(`  5. test-gen (gemini)\n`)
    process.stderr.write(`  6. review (gemini)\n`)
    process.stderr.write(`  7. implement (claude, ralph, max-iter ${opts.max_iter})\n`)
    process.stderr.write(`  8. verify (gemini)\n`)
    process.stderr.write(`  9. ruminate (claude)\n`)
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
  }

  // -- 3. plan (claude) --

  if (!await run_fn(() => plan_main([]), "plan")) {
    return 1
  }

  // -- 4. tasks (claude) --

  if (!await run_fn(() => tasks_main([]), "tasks")) {
    return 1
  }

  // -- 5. test-gen (gemini) --

  if (!await run_fn(() => testgen_main([]), "test-gen (gemini)")) {
    process.stderr.write("warning: test-gen failed, continuing without generated tests\n")
    warnings.push("test-gen")
  }

  // -- 6. review (gemini) --

  if (!await run_fn(() => review_main([]), "review (gemini)")) {
    process.stderr.write("warning: review failed, continuing without antagonist review\n")
    warnings.push("review")
  }

  // -- 7. implement (claude) --

  process.stderr.write(`\n--- implement (claude, ralph, max-iter ${opts.max_iter}) ---\n`)
  const impl_result = await ralph({
    fn:         () => implement_main([]),
    max_iter:   opts.max_iter,
    max_budget: 0,
    timeout_ms: 0,
    session_id: null,
  })

  if (impl_result.status !== "complete") {
    process.stderr.write(`\nerror: implement ${impl_result.status} after ${impl_result.iterations} iterations\n`)
    if (!confirm("implementation did not complete cleanly. continue anyway? [y/N] ")) {
      process.stderr.write("stopped at implement\n")
      return 1
    }
  }

  // -- 8. verify (gemini) --

  if (!await run_fn(() => verify_main([]), "verify (gemini)")) {
    process.stderr.write("warning: verify failed, continuing...\n")
    warnings.push("verify")
  }

  // -- 9. ruminate (claude) --

  const ruminate_args = !opts.interactive ? ["--yes"] : []
  if (!await run_fn(() => ruminate_main(ruminate_args), "ruminate")) {
    process.stderr.write("warning: ruminate failed, continuing...\n")
    warnings.push("ruminate")
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
