#!/usr/bin/env bun
//
// bny hop — the dark factory, unified 4-phase pipeline
//
// spec → plan → test → build
//
// auto-detects greenfield vs iteration. one command to rule them all.
//
// usage:
//   bny hop "add user auth"              # full pipeline
//   bny hop --force-new "..."            # force greenfield
//   bny hop --force-evolve "..."         # force iteration
//   bny hop --dry-run "..."              # show what would run
//   bny hop --interactive "..."          # pause at checkpoints
//

import { openSync, readSync, closeSync } from "node:fs"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { read_input } from "./lib/input.ts"
import { run_spec } from "./spec.ts"
import type { SpecMode } from "./spec.ts"
import { run_plan_phase } from "./plan-phase.ts"
import { run_test_phase } from "./test-phase.ts"
import { run_build_phase } from "./build-phase.ts"
import { init_state, update_state, write_state, load_constraints } from "./lib/state.ts"

// -- help --

const HELP = `usage: bny hop [--force-new|--force-evolve] [--dry-run] [--interactive] [--max-iter N] <description>

the dark factory. 4 phases, one command. auto-initializes on first use.

  phase 1: spec     specify (claude) + challenge (gemini)
  phase 2: plan     plan (claude) + tasks (claude)
  phase 3: test     3×3 narrowing — test-gen (gemini) + implement (claude)
  phase 4: build    implement (claude) + verify (gemini) + retro + ruminate

default mode is evolve — every hop is evolution. use --force-new for blank-slate.

flags:
  --force-new       force greenfield mode
  --force-evolve    force iteration mode (default)
  --dry-run         show what would run, don't execute
  --interactive, -i pause for human review at phase boundaries
  --max-iter N      retries per narrowing round (default: 3)

input:
  <text...>              inline text
  -                      read from stdin
  --input <path>         read from file

examples:
  bny hop "add user auth"
  bny hop --force-evolve "add rate limiting to the API"
  bny hop --input requirements.md
  bny hop --interactive "redesign the auth flow"
`

// -- main --

export async function main(argv: string[]): Promise<number> {
  const { text: input_text, rest_argv } = read_input(argv)

  let mode: SpecMode = "evolve"
  let dry_run = false
  let interactive = false
  let max_iter = 3
  const positional: string[] = []

  for (let i = 0; i < rest_argv.length; i++) {
    const arg = rest_argv[i]
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(HELP)
      return 0
    } else if (arg === "--force-new") {
      mode = "new"
    } else if (arg === "--force-evolve") {
      mode = "evolve"
    } else if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--interactive" || arg === "-i") {
      interactive = true
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

  // can resume an existing feature if no description given
  const feature = current_feature()
  const need_spec = !feature && description.length > 0

  if (!feature && !description) {
    process.stderr.write("error: no current feature and no description given\n")
    process.stderr.write("usage: bny hop \"description\"\n")
    return 1
  }

  const label = description || feature || "unknown"

  if (dry_run) {
    process.stderr.write(`[bny hop] dry-run: ${label}\n`)
    process.stderr.write(`  mode: ${mode}\n`)
    process.stderr.write(`  max-iter: ${max_iter}\n\n`)
    if (need_spec) {
      process.stderr.write(`  phase 1 (spec):\n`)
      process.stderr.write(`    1a. specify "${description}" (claude)\n`)
      process.stderr.write(`    1b. challenge (gemini)\n`)
    } else {
      process.stderr.write(`  phase 1 (spec): skip — feature exists: ${feature}\n`)
    }
    process.stderr.write(`  phase 2 (plan):\n`)
    process.stderr.write(`    2a. plan (claude)\n`)
    process.stderr.write(`    2b. tasks (claude)\n`)
    process.stderr.write(`  phase 3 (test): narrow 3×3 (max-iter ${max_iter})\n`)
    process.stderr.write(`    3.1a. test-gen:contracts (gemini)\n`)
    process.stderr.write(`    3.1b. implement:contracts (claude, ralph)\n`)
    process.stderr.write(`    3.2a. test-gen:properties (gemini)\n`)
    process.stderr.write(`    3.2b. implement:properties (claude, ralph)\n`)
    process.stderr.write(`    3.3a. test-gen:boundaries+golden (gemini)\n`)
    process.stderr.write(`    3.3b. implement:boundaries+golden (claude, ralph)\n`)
    process.stderr.write(`  phase 4 (build):\n`)
    process.stderr.write(`    4a. implement (claude, ralph)\n`)
    process.stderr.write(`    4b. verify (gemini)\n`)
    process.stderr.write(`    4c. retro (claude)\n`)
    process.stderr.write(`    4d. ruminate → worldview (claude)\n`)
    return 0
  }

  // -- durable state --

  let state = init_state({
    feature: feature || description,
    description,
    pipeline: "hop",
    constraints: load_constraints(root),
  })
  write_state(root, state)

  process.stderr.write(`\n[bny hop] ${label}\n`)
  process.stderr.write(`  mode: ${mode}\n`)
  process.stderr.write(`  max-iter: ${max_iter}\n\n`)

  const warnings: string[] = []

  // -- confirm helper --

  function confirm(prompt: string): boolean {
    if (!interactive) return true
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
      return false
    } finally {
      if (fd !== null) closeSync(fd)
    }
  }

  // ==========================================
  // PHASE 1: SPEC (specify + challenge)
  // ==========================================

  if (need_spec) {
    state = update_state(state, "spec", "in_progress")
    write_state(root, state)

    process.stderr.write(`\n=== phase 1: spec ===\n`)
    const spec_code = await run_spec(description, root, { mode, interactive })
    if (spec_code !== 0) {
      state = update_state(state, "spec", "failed")
      write_state(root, state)
      return 1
    }

    state = update_state(state, "spec", "completed")
    write_state(root, state)

    // interactive checkpoint after spec
    if (interactive) {
      const feat = current_feature()
      if (feat) {
        const paths = feature_paths(root, feat)
        process.stderr.write(`\n--- review spec ---\n`)
        process.stderr.write(`spec: ${paths.spec}\n`)
        if (!confirm("continue to phase 2? [Y/n] ")) {
          process.stderr.write("stopped after spec\n")
          return 0
        }
      }
    }
  } else {
    process.stderr.write(`\n=== phase 1: spec (skip — feature: ${feature}) ===\n`)
  }

  // ==========================================
  // PHASE 2: PLAN (plan + tasks)
  // ==========================================

  state = update_state(state, "plan", "in_progress")
  write_state(root, state)

  process.stderr.write(`\n=== phase 2: plan ===\n`)
  const plan_code = await run_plan_phase([])
  if (plan_code !== 0) {
    state = update_state(state, "plan", "failed")
    write_state(root, state)
    return 1
  }

  state = update_state(state, "plan", "completed")
  write_state(root, state)

  if (interactive) {
    if (!confirm("continue to phase 3 (test)? [Y/n] ")) {
      process.stderr.write("stopped after plan\n")
      return 0
    }
  }

  // ==========================================
  // PHASE 3: TEST (test-gen + 3×3 narrowing)
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

    if (interactive) {
      if (!confirm("test phase failed. continue to build anyway? [y/N] ")) {
        process.stderr.write("stopped after test\n")
        return 1
      }
      warnings.push("test")
    } else {
      return 1
    }
  } else {
    state = update_state(state, "test", "completed")
    write_state(root, state)
  }

  if (interactive && test_code === 0) {
    if (!confirm("continue to phase 4 (build)? [Y/n] ")) {
      process.stderr.write("stopped after test\n")
      return 0
    }
  }

  // ==========================================
  // PHASE 4: BUILD (implement + verify + retro + ruminate)
  // ==========================================

  state = update_state(state, "build", "in_progress")
  write_state(root, state)

  process.stderr.write(`\n=== phase 4: build ===\n`)
  const build_code = await run_build_phase(root, { max_iter, interactive })
  if (build_code !== 0) {
    state = update_state(state, "build", "failed")
    write_state(root, state)
    return 1
  }

  state = update_state(state, "build", "completed")
  write_state(root, state)

  // -- done --

  if (warnings.length > 0) {
    process.stderr.write(`\n[bny hop] complete with warnings: ${warnings.join(", ")}\n`)
    process.stderr.write(`  ${label}\n`)
    return 2
  }

  process.stderr.write(`\n[bny hop] complete: ${label}\n`)
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
