#!/usr/bin/env bun
//
// bny test — phase 3: test-gen + 3×3 narrowing
//
// gemini generates tests, claude implements to pass them.
// 3 rounds of increasingly adversarial tests.
//
// usage:
//   bny test                  # run all 3 narrowing rounds
//   bny test --max-iter 5     # more retries per round
//   bny test --dry-run        # show what would run
//

import { find_root } from "./lib/feature.ts"
import { ralph } from "./lib/ralph.ts"
import { main as testgen_main } from "./test-gen.ts"
import { main as implement_main } from "./implement.ts"
import { main as lock_tests_main } from "./lock-tests.ts"

// -- constants --

const NARROW_ROUNDS = [
  { round: 1, label: "contracts" },
  { round: 2, label: "properties" },
  { round: 3, label: "boundaries+golden" },
] as const

// -- help --

const HELP = `usage: bny test [--dry-run] [--max-iter N]

phase 3: test-gen + 3×3 narrowing.

gemini generates tests in 3 rounds of increasing adversarial intensity.
claude implements to pass them, with retries per round.

narrowing rounds:
  1. contracts        — spec-as-code tests (gemini sees spec + challenge)
  2. properties       — behavioral invariants (gemini sees spec + claude's code)
  3. boundaries+golden — edge cases + regressions (gemini sees everything)

each round: test-gen (gemini) → implement (claude, max-iter retries).
max 9 test runs total (3 rounds × 3 retries). typical: ~4.

flags:
  --dry-run        show what would run, don't execute
  --max-iter N     retries per narrowing round (default: 3)
`

// -- main --

export async function main(argv: string[]): Promise<number> {
  let dry_run = false
  let max_iter = 3

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
    }
  }

  const root = find_root()

  if (dry_run) {
    process.stderr.write(`[bny test] dry-run:\n`)
    process.stderr.write(`  narrow 3×3 (max-iter ${max_iter} per round):\n`)
    for (const { round, label } of NARROW_ROUNDS) {
      process.stderr.write(`    ${round}a. test-gen:${label} (gemini)\n`)
      process.stderr.write(`    ${round}b. implement:${label} (claude, ralph)\n`)
    }
    return 0
  }

  return run_test_phase(root, { max_iter })
}

// -- exported for use by hop.ts --

export interface TestOpts {
  max_iter: number
  on_step?: (step: string, status: string, round: number) => void
}

export async function run_test_phase(root: string, opts: TestOpts): Promise<number> {
  process.stderr.write(`\n--- narrow 3×3 (max-iter ${opts.max_iter} per round) ---\n`)

  for (const { round, label } of NARROW_ROUNDS) {
    // test-gen for this round
    opts.on_step?.(`test-gen:${label}`, "in_progress", round)
    process.stderr.write(`\n--- test-gen:${label} (gemini, round ${round}) ---\n`)
    const tg_code = await testgen_main(["--round", String(round)])
    if (tg_code !== 0) {
      opts.on_step?.(`test-gen:${label}`, "failed", round)
      process.stderr.write(`warning: test-gen:${label} failed (exit ${tg_code}), skipping round\n`)
      continue
    }
    opts.on_step?.(`test-gen:${label}`, "completed", round)

    // implement with retries
    opts.on_step?.(`implement:${label}`, "in_progress", round)
    process.stderr.write(`\n--- implement:${label} (claude, ralph, max-iter ${opts.max_iter}) ---\n`)
    const result = await ralph({
      fn:         () => implement_main(["--round", String(round)]),
      max_iter:   opts.max_iter,
      max_budget: 0,
      timeout_ms: 0,
      session_id: null,
    })

    if (result.status !== "complete") {
      opts.on_step?.(`implement:${label}`, "failed", round)
      process.stderr.write(`\nerror: implement:${label} ${result.status} after ${result.iterations} iterations\n`)
      return 1
    }
    opts.on_step?.(`implement:${label}`, "completed", round)

    process.stderr.write(`\n--- round ${round} (${label}) complete ---\n`)
  }

  // -- lock adversarial tests --

  process.stderr.write(`\n--- locking adversarial tests ---\n`)
  const lock_code = await lock_tests_main([])
  if (lock_code !== 0) {
    process.stderr.write(`warning: test locking failed (exit ${lock_code}), continuing...\n`)
  }

  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
