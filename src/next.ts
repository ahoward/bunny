#!/usr/bin/env bun
//
// bny next — pick the next roadmap item and run the full pipeline
//
// reads bny/roadmap.md, extracts the first unchecked item,
// and orchestrates: spec → plan → test → build (4-phase pipeline)
//
// usage:
//   bny next                    # run the pipeline
//   bny next --dry-run          # show what would run
//   bny next --max-iter 10      # ralph iterations for implement
//

import { existsSync, readFileSync, writeFileSync, openSync, readSync, closeSync } from "node:fs"
import { resolve } from "node:path"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { spawn_sync } from "./lib/spawn.ts"
import { run_spec } from "./spec.ts"
import { run_plan_phase } from "./plan-phase.ts"
import { run_test_phase } from "./test-phase.ts"
import { run_build_phase } from "./build-phase.ts"
import { init_state, update_state, write_state, load_constraints } from "./lib/state.ts"

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

picks the next roadmap item and runs the 4-phase pipeline:

  phase 1: spec     specify (claude) + challenge (gemini)
  phase 2: plan     plan (claude) + tasks (claude)
  phase 3: test     3×3 narrowing (gemini + claude)
  phase 4: build    implement + verify + retro + ruminate

then updates roadmap + decisions.

flags:
  --dry-run          show what would run, don't execute
  --interactive, -i  pause for human review at phase boundaries
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
    process.stderr.write(`  2. phase 1 (spec): specify + challenge\n`)
    process.stderr.write(`  3. phase 2 (plan): plan + tasks\n`)
    process.stderr.write(`  4. phase 3 (test): 3×3 narrowing (max-iter ${max_iter})\n`)
    process.stderr.write(`  5. phase 4 (build): implement + verify + retro + ruminate\n`)
    process.stderr.write(`  6. ./dev/post_flight\n`)
    process.stderr.write(`  7. update roadmap + decisions\n`)
    return 0
  }

  // -- durable state --
  let state = init_state({
    feature: item_name,
    description: item_desc,
    pipeline: "next",
    constraints: load_constraints(root),
  })
  write_state(root, state)

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

  function confirm(prompt: string): boolean {
    if (!interactive) return true
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
      return false
    } finally {
      process.removeListener("SIGINT", on_sigint)
      if (fd !== null) closeSync(fd)
    }
  }

  // -- 1. pre_flight --

  if (!run_ext(["./dev/pre_flight"], "pre_flight")) {
    return 1
  }

  // ==========================================
  // PHASE 1: SPEC
  // ==========================================

  state = update_state(state, "spec", "in_progress")
  write_state(root, state)

  process.stderr.write(`\n=== phase 1: spec ===\n`)
  const spec_code = await run_spec(item_name, root, { mode: "evolve", interactive })
  if (spec_code !== 0) {
    state = update_state(state, "spec", "failed")
    write_state(root, state)
    return 1
  }
  state = update_state(state, "spec", "completed")
  write_state(root, state)

  // interactive checkpoint
  if (interactive) {
    const feature = current_feature()
    if (feature) {
      const paths = feature_paths(root, feature)
      process.stderr.write(`\n--- review spec ---\n`)
      process.stderr.write(`spec: ${paths.spec}\n`)
      if (!confirm("continue to phase 2? [Y/n] ")) {
        process.stderr.write("aborted by human\n")
        return 0
      }
    }
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
    return 1
  }
  state = update_state(state, "plan", "completed")
  write_state(root, state)

  // ==========================================
  // PHASE 3: TEST
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
      if (!confirm("test phase failed. continue? [y/N] ")) {
        process.stderr.write("stopped at test\n")
        return 1
      }
    } else {
      return 1
    }
  } else {
    state = update_state(state, "test", "completed")
    write_state(root, state)
  }

  // ==========================================
  // PHASE 4: BUILD
  // ==========================================

  state = update_state(state, "build", "in_progress")
  write_state(root, state)

  process.stderr.write(`\n=== phase 4: build ===\n`)
  const build_code = await run_build_phase(root, { max_iter, interactive })
  if (build_code !== 0) {
    state = update_state(state, "build", "failed")
    write_state(root, state)
    process.stderr.write("warning: build phase did not complete cleanly\n")
  } else {
    state = update_state(state, "build", "completed")
    write_state(root, state)
  }

  // -- post_flight --

  if (!run_ext(["./dev/post_flight"], "post_flight")) {
    process.stderr.write("warning: post_flight failed\n")
  }

  // -- update roadmap + decisions --

  process.stderr.write(`\n--- updating roadmap + decisions ---\n`)

  const updated_roadmap = roadmap.replace(
    `- [ ] ${item_text}`,
    `- [x] ${item_text}`
  )
  writeFileSync(roadmap_path, updated_roadmap)
  process.stderr.write(`roadmap: checked off '${item_name}'\n`)

  const decisions_path = resolve(root, "bny/decisions.md")
  if (existsSync(decisions_path)) {
    const today = new Date().toISOString().slice(0, 10)
    const decisions = readFileSync(decisions_path, "utf-8")
    const row = `| ${today} | ${item_name} | Built via bny next (4-phase pipeline) |\n`
    writeFileSync(decisions_path, decisions.trimEnd() + "\n" + row)
    process.stderr.write(`decisions: appended '${item_name}'\n`)
  }

  process.stderr.write(`\n[bny next] complete: ${item_text}\n`)
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
