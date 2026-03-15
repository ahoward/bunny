#!/usr/bin/env bun
//
// bny next — pick the next roadmap item and run the full pipeline
//
// reads bny/roadmap.md, extracts the first unchecked item,
// and orchestrates: specify → challenge → (human reviews spec) → plan → tasks →
// narrow[1→2→3] → verify → retro → post_flight → update roadmap + decisions
//
// usage:
//   bny next                    # run the pipeline
//   bny next --dry-run          # show what would run
//   bny next --max-iter 10      # ralph iterations for implement
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
// review is absorbed into narrowing rounds 2-3
import { main as implement_main } from "./implement.ts"
import { main as verify_main } from "./verify.ts"
import { main as ruminate_main } from "./ruminate.ts"
import { main as retro_main } from "./retro.ts"
import { spawn_sync } from "./lib/spawn.ts"
import { init_state, update_state, write_state, load_constraints } from "./lib/state.ts"

const NARROW_ROUNDS = [
  { round: 1, label: "contracts" },
  { round: 2, label: "properties" },
  { round: 3, label: "boundaries+golden" },
] as const

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  let dry_run = false
  let interactive = false
  let max_iter = 3

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--interactive" || arg === "-i") {
      interactive = true
    } else if (arg === "--max-iter" && argv[i + 1]) {
      const val = parseInt(argv[i + 1], 10)
      if (!isNaN(val) && val > 0) max_iter = val
      i++
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny next [--dry-run] [--interactive] [--max-iter N]

picks the next roadmap item and runs the full pipeline:
  1. pre_flight
  2. specify (claude)
  3. challenge (gemini — harden spec)
  4. (human reviews spec, if --interactive)
  5. plan (claude)
  6. tasks (claude)
  7. narrow 3×3 (test-gen → implement × 3 rounds)
  8. verify (gemini — post-implementation review)
  9. retro (claude — quick retrospective)
  10. post_flight
  11. update roadmap + decisions

flags:
  --dry-run          show what would run, don't execute
  --interactive, -i  pause for human review at checkpoints
  --max-iter N       retries per narrowing round (default: 3)
`)
      return 0
    }
  }

  // -- setup --

  const root = find_root()

  // -- parse roadmap --

  const roadmap_path = resolve(root, "bny/roadmap.md")
  if (!existsSync(roadmap_path)) {
    process.stderr.write("error: bny/roadmap.md not found\n")
    return 1
  }

  const roadmap = readFileSync(roadmap_path, "utf-8")

  // find ## Next section, extract first unchecked item
  const next_match = roadmap.match(/## Next\n\n([\s\S]*?)(?=\n## |\n*$)/)
  if (!next_match) {
    process.stderr.write("error: no '## Next' section in roadmap\n")
    return 1
  }

  const next_section = next_match[1]
  const item_match = next_section.match(/^- \[ \] (.+)$/m)
  if (!item_match) {
    process.stderr.write("nothing to do — all roadmap items completed\n")
    return 0
  }

  const item_text = item_match[1].trim()
  // split on " — " to get name and description
  const dash_idx = item_text.indexOf(" — ")
  const item_name = dash_idx >= 0 ? item_text.slice(0, dash_idx).trim() : item_text
  const item_desc = dash_idx >= 0 ? item_text.slice(dash_idx + 3).trim() : item_text

  process.stderr.write(`\n[bny next]\n`)
  process.stderr.write(`  item: ${item_text}\n`)
  process.stderr.write(`  max-iter: ${max_iter}\n\n`)

  if (dry_run) {
    process.stderr.write(`would run:\n`)
    process.stderr.write(`  1. ./dev/pre_flight\n`)
    process.stderr.write(`  2. bny specify "${item_name}" (claude)\n`)
    process.stderr.write(`  3. bny challenge (gemini)\n`)
    process.stderr.write(`  4. (human reviews spec)\n`)
    process.stderr.write(`  5. bny plan (claude)\n`)
    process.stderr.write(`  6. bny tasks (claude)\n`)
    process.stderr.write(`  7. narrow 3×3 (max-iter ${max_iter} per round):\n`)
    for (const { round, label } of NARROW_ROUNDS) {
      process.stderr.write(`     ${round}a. test-gen:${label} (gemini)\n`)
      process.stderr.write(`     ${round}b. implement:${label} (claude, ralph)\n`)
    }
    process.stderr.write(`  8. bny verify (gemini)\n`)
    process.stderr.write(`  9. bny retro (claude)\n`)
    process.stderr.write(` 10. ./dev/post_flight\n`)
    process.stderr.write(` 11. update roadmap + decisions\n`)
    return 0
  }

  // -- durable state --
  let build_state = init_state({
    feature: item_name,
    description: item_desc,
    pipeline: "next",
    constraints: load_constraints(root),
  })
  write_state(root, build_state)

  // -- helpers --

  function run_ext(cmd: string[], label: string): boolean {
    process.stderr.write(`\n--- ${label} ---\n`)
    const r = spawn_sync({ cmd, cwd: root, label })
    if (!r.ok) {
      process.stderr.write(`\nerror: ${label} failed (exit ${r.exit_code})\n`)
      return false
    }
    return true
  }

  async function run_fn(fn: () => Promise<number>, label: string): Promise<boolean> {
    build_state = update_state(build_state, label, "in_progress")
    write_state(root, build_state)

    process.stderr.write(`\n--- ${label} ---\n`)
    const code = await fn()

    build_state = update_state(build_state, label, code === 0 ? "completed" : "failed")
    write_state(root, build_state)

    if (code !== 0) {
      process.stderr.write(`\nerror: ${label} failed (exit ${code})\n`)
      return false
    }
    return true
  }

  function confirm(prompt: string): boolean {
    // handle ctrl-c during confirmation
    let interrupted = false
    const on_sigint = () => { interrupted = true }
    process.on("SIGINT", on_sigint)

    process.stderr.write(prompt)
    const buf = Buffer.alloc(64)
    let fd: number | null = null
    try {
      fd = openSync("/dev/tty", "r")
      const n = readSync(fd, buf, 0, 64, null)
      if (interrupted) {
        process.stderr.write("\naborted\n")
        process.exit(130)
      }
      const answer = buf.slice(0, n).toString().trim().toLowerCase()
      return answer === "" || answer === "y" || answer === "yes"
    } catch {
      if (interrupted) {
        process.stderr.write("\naborted\n")
        process.exit(130)
      }
      process.stderr.write("warning: could not read /dev/tty, defaulting to no\n")
      return false // safe default
    } finally {
      process.removeListener("SIGINT", on_sigint)
      if (fd !== null) closeSync(fd)
    }
  }

  // -- 1. pre_flight (external project script) --

  if (!run_ext(["./dev/pre_flight"], "pre_flight")) {
    return 1
  }

  // -- 2. specify --

  if (!await run_fn(() => specify_main([item_name]), "specify")) {
    return 1
  }

  // find the spec that was just created
  const feature = current_feature()
  if (!feature) {
    process.stderr.write("error: could not determine feature branch after specify\n")
    return 1
  }

  const paths = feature_paths(root, feature)

  // -- 3. challenge (gemini — harden spec) --

  if (!await run_fn(() => challenge_main([]), "challenge (gemini)")) {
    process.stderr.write("warning: challenge failed, continuing without spec hardening\n")
  }

  // -- 4. human reviews spec --

  if (interactive) {
    process.stderr.write(`\n--- human checkpoint ---\n`)
    process.stderr.write(`spec: ${paths.spec}\n`)
    process.stderr.write(`\nreview the spec, edit if needed.\n`)

    if (!confirm("continue? [Y/n] ")) {
      process.stderr.write("aborted by human\n")
      return 0
    }
  }

  // -- 5. plan --

  if (!await run_fn(() => plan_main([]), "plan")) {
    return 1
  }

  // -- 6. tasks --

  if (!await run_fn(() => tasks_main([]), "tasks")) {
    return 1
  }

  // -- 7. narrow (3×3: test-gen → implement × 3 rounds) --

  build_state = update_state(build_state, "narrow", "in_progress")
  write_state(root, build_state)

  process.stderr.write(`\n--- narrow 3×3 (max-iter ${max_iter} per round) ---\n`)
  let narrow_failed = false

  for (const { round, label } of NARROW_ROUNDS) {
    // test-gen for this round
    build_state = update_state(build_state, `test-gen:${label}`, "in_progress", round)
    write_state(root, build_state)

    process.stderr.write(`\n--- test-gen:${label} (gemini, round ${round}) ---\n`)
    const tg_code = await testgen_main(["--round", String(round)])
    if (tg_code !== 0) {
      build_state = update_state(build_state, `test-gen:${label}`, "failed", round)
      write_state(root, build_state)
      process.stderr.write(`warning: test-gen:${label} failed (exit ${tg_code}), skipping round\n`)
      continue
    }
    build_state = update_state(build_state, `test-gen:${label}`, "completed", round)
    write_state(root, build_state)

    // implement with retries
    build_state = update_state(build_state, `implement:${label}`, "in_progress", round)
    write_state(root, build_state)

    process.stderr.write(`\n--- implement:${label} (claude, ralph, max-iter ${max_iter}) ---\n`)
    const result = await ralph({
      fn:         () => implement_main(["--round", String(round)]),
      max_iter,
      max_budget: 0,
      timeout_ms: 0,
      session_id: null,
    })

    if (result.status !== "complete") {
      build_state = update_state(build_state, `implement:${label}`, "failed", round)
      write_state(root, build_state)
      process.stderr.write(`\nerror: implement:${label} ${result.status} after ${result.iterations} iterations\n`)
      narrow_failed = true
      if (interactive) {
        if (!confirm("narrowing round failed. continue? [y/N] ")) {
          process.stderr.write("stopped at narrow\n")
          return 1
        }
      }
      break
    }
    build_state = update_state(build_state, `implement:${label}`, "completed", round)
    write_state(root, build_state)

    process.stderr.write(`\n--- round ${round} (${label}) complete ---\n`)
  }

  build_state = update_state(build_state, "narrow", narrow_failed ? "failed" : "completed")
  write_state(root, build_state)

  if (narrow_failed) {
    process.stderr.write("warning: narrowing did not complete cleanly\n")
  }

  // -- 8. verify (gemini — post-implementation review) --

  if (!await run_fn(() => verify_main([]), "verify (gemini)")) {
    process.stderr.write("warning: verify failed, continuing...\n")
  }

  // -- 9. retro (claude — quick retrospective) --

  if (!await run_fn(() => retro_main([]), "retro")) {
    process.stderr.write("warning: retro failed, continuing...\n")
  }

  // -- 10. post_flight (external project script) --

  if (!run_ext(["./dev/post_flight"], "post_flight")) {
    process.stderr.write("warning: post_flight failed\n")
  }

  // -- 11. update roadmap + decisions --

  process.stderr.write(`\n--- updating roadmap + decisions ---\n`)

  // check off the item in roadmap
  const updated_roadmap = roadmap.replace(
    `- [ ] ${item_text}`,
    `- [x] ${item_text}`
  )
  writeFileSync(roadmap_path, updated_roadmap)
  process.stderr.write(`roadmap: checked off '${item_name}'\n`)

  // append to decisions
  const decisions_path = resolve(root, "bny/decisions.md")
  if (existsSync(decisions_path)) {
    const today = new Date().toISOString().slice(0, 10)
    const decisions = readFileSync(decisions_path, "utf-8")
    const row = `| ${today} | ${item_name} | Built via bny next (strange loop iteration) |\n`
    writeFileSync(decisions_path, decisions.trimEnd() + "\n" + row)
    process.stderr.write(`decisions: appended '${item_name}'\n`)
  }

  // -- 12. report --

  process.stderr.write(`\n[bny next] complete: ${item_text}\n`)
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
