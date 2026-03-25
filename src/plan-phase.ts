#!/usr/bin/env bun
//
// bny plan — phase 2: plan + tasks
//
// generates implementation plan (claude) then task list (claude).
//
// usage:
//   bny plan                  # uses current feature
//   bny plan --dry-run        # show what would run
//

import { find_root, current_feature } from "./lib/feature.ts"
import { main as plan_main } from "./plan.ts"
import { main as tasks_main } from "./tasks.ts"

// -- help --

const HELP = `usage: bny plan [--dry-run] [feature-name]

phase 2: plan + tasks.

generates an implementation plan from the spec (claude), then a task list
from the plan (claude). both are idempotent — existing artifacts are skipped.

flags:
  --dry-run        show what would run, don't execute

examples:
  bny plan                   # plan + tasks for current feature
  bny plan 001-auth          # explicit feature
`

// -- main --

export async function main(argv: string[]): Promise<number> {
  let dry_run = false
  const pass_through: string[] = []

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(HELP)
      return 0
    } else if (arg === "--dry-run") {
      dry_run = true
    } else {
      pass_through.push(arg)
    }
  }

  if (dry_run) {
    process.stderr.write(`[bny plan] dry-run:\n`)
    process.stderr.write(`  1. plan (claude)\n`)
    process.stderr.write(`  2. tasks (claude)\n`)
    return 0
  }

  return run_plan_phase(argv)
}

// -- exported for use by hop.ts --

export async function run_plan_phase(argv: string[] = []): Promise<number> {
  process.stderr.write(`\n--- plan (claude) ---\n`)
  const plan_code = await plan_main(argv)
  if (plan_code !== 0) {
    process.stderr.write(`\nerror: plan failed (exit ${plan_code})\n`)
    return 1
  }

  process.stderr.write(`\n--- tasks (claude) ---\n`)
  const tasks_code = await tasks_main(argv)
  if (tasks_code !== 0) {
    process.stderr.write(`\nerror: tasks failed (exit ${tasks_code})\n`)
    return 1
  }

  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
