#!/usr/bin/env bun
//
// bny build — phase 4: implement + verify + retro → ruminate
//
// claude implements to pass tests, gemini verifies, claude reflects.
// retro feeds automatically into the brane worldview.
//
// usage:
//   bny build                 # run phase 4 for current feature
//   bny build --max-iter 5    # more retries per narrowing round
//   bny build --dry-run       # show what would run
//
// note: "bny build <description>" (old behavior) delegates to bny hop
//       with a deprecation warning.
//

import { find_root, current_feature } from "./lib/feature.ts"
import { read_input } from "./lib/input.ts"
import { main as implement_main } from "./implement.ts"
import { main as verify_main } from "./verify.ts"
import { main as review_artifact_main } from "./review-artifact.ts"
import { main as retro_main } from "./retro.ts"
import { main as ruminate_main } from "./ruminate.ts"
import { ralph } from "./lib/ralph.ts"

// -- help --

const HELP = `usage: bny build [--dry-run] [--max-iter N]

phase 4: implement + verify + retro → ruminate.

claude implements to make tests pass (with retries), gemini verifies
post-implementation, then claude reflects and feeds the knowledge graph.

flags:
  --dry-run        show what would run, don't execute
  --max-iter N     retries for implement (default: 3)

note: for the full pipeline, use 'bny hop "description"' instead.
      'bny build "description"' is deprecated and delegates to bny hop.
`

// -- main --

export async function main(argv: string[]): Promise<number> {
  const { text: input_text, rest_argv } = read_input(argv)

  let dry_run = false
  let max_iter = 3
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

  // if given a description, this is the old "bny build <desc>" usage
  // delegate to hop with deprecation warning
  if (description) {
    process.stderr.write(`warning: 'bny build "<description>"' is deprecated — use 'bny hop "${description}"' instead\n`)
    // dynamic import to avoid circular dependency
    const { main: hop_main } = await import("./hop.ts")
    return hop_main(argv)
  }

  if (dry_run) {
    process.stderr.write(`[bny build] dry-run:\n`)
    process.stderr.write(`  1.  implement (claude, ralph, max-iter ${max_iter})\n`)
    process.stderr.write(`  2a. verify:adversarial (gemini reads source)\n`)
    process.stderr.write(`  2b. verify:behavioral (gemini reads SPEC.md + artifact)\n`)
    process.stderr.write(`  3.  review artifact\n`)
    process.stderr.write(`  4.  retro (claude)\n`)
    process.stderr.write(`  5.  ruminate → worldview (claude)\n`)
    return 0
  }

  return run_build_phase(find_root(), { max_iter })
}

// -- exported for use by hop.ts --

export interface BuildOpts {
  max_iter:     number
  interactive?: boolean
}

export async function run_build_phase(root: string, opts: BuildOpts): Promise<number> {
  const warnings: string[] = []

  // -- 1. implement (claude, with retries) --

  process.stderr.write(`\n--- implement (claude, max-iter ${opts.max_iter}) ---\n`)
  const impl_result = await ralph({
    fn:         () => implement_main([]),
    max_iter:   opts.max_iter,
    max_budget: 0,
    timeout_ms: 0,
    session_id: null,
  })

  if (impl_result.status !== "complete") {
    process.stderr.write(`\nerror: implement ${impl_result.status} after ${impl_result.iterations} iterations\n`)
    return 1
  }

  // -- 2a. verify:adversarial (gemini reads source — finds bugs) --

  process.stderr.write(`\n--- verify:adversarial (gemini) ---\n`)
  const verify_adv_code = await verify_main(["--adversarial"])
  if (verify_adv_code !== 0) {
    process.stderr.write(`warning: verify:adversarial failed (exit ${verify_adv_code}), continuing...\n`)
    warnings.push("verify:adversarial")
  }

  // -- 2b. verify:behavioral (gemini reads SPEC.md + artifact — checks completeness) --

  process.stderr.write(`\n--- verify:behavioral (gemini) ---\n`)
  const verify_beh_code = await verify_main(["--behavioral"])
  if (verify_beh_code !== 0) {
    process.stderr.write(`warning: verify:behavioral failed (exit ${verify_beh_code}), continuing...\n`)
    warnings.push("verify:behavioral")
  }

  // -- 3. review artifact --

  process.stderr.write(`\n--- review artifact ---\n`)
  const review_code = await review_artifact_main([])
  if (review_code !== 0) {
    process.stderr.write(`warning: review artifact failed (exit ${review_code}), continuing...\n`)
    warnings.push("review-artifact")
  }

  // -- 4. retro (claude) --

  process.stderr.write(`\n--- retro (claude) ---\n`)
  const retro_code = await retro_main([])
  if (retro_code !== 0) {
    process.stderr.write(`warning: retro failed (exit ${retro_code}), continuing...\n`)
    warnings.push("retro")
  }

  // -- 5. ruminate → worldview (claude, auto-yes) --

  process.stderr.write(`\n--- ruminate → worldview (claude) ---\n`)
  const ruminate_code = await ruminate_main(["--yes"])
  if (ruminate_code !== 0) {
    process.stderr.write(`warning: ruminate failed (exit ${ruminate_code}), continuing...\n`)
    warnings.push("ruminate")
  }

  if (warnings.length > 0) {
    process.stderr.write(`\n[bny build] complete with warnings: ${warnings.join(", ")}\n`)
    return 0 // non-fatal warnings
  }

  process.stderr.write(`\n[bny build] complete\n`)
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
