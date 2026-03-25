#!/usr/bin/env bun
//
// bny spec — phase 1: specify + challenge
//
// creates a feature spec (claude) then hardens it (gemini).
// auto-detects greenfield vs iteration based on codebase context.
//
// usage:
//   bny spec "add user auth"       # greenfield or iteration (auto-detect)
//   bny spec --force-new "..."     # force greenfield mode
//   bny spec --force-evolve "..."  # force iteration mode
//   bny spec --dry-run "..."       # show what would run
//

import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { read_input } from "./lib/input.ts"
import { main as specify_main } from "./specify.ts"
import { main as challenge_main } from "./challenge.ts"
import { init_state, update_state, write_state, load_constraints } from "./lib/state.ts"

// -- types --

export type SpecMode = "evolve" | "new"

// -- help --

const HELP = `usage: bny spec [--force-new|--force-evolve] [--dry-run] [--interactive] <description>

phase 1: specify + challenge.

creates a change spec (claude) then hardens it with adversarial review (gemini).
default mode is evolve — every hop is evolution. use --force-new for blank-slate.

flags:
  --force-new       force greenfield mode (ignore existing code)
  --force-evolve    force iteration mode (default — change spec, not new spec)
  --dry-run         show what would run, don't execute
  --interactive, -i pause for human review after spec, before challenge

input:
  <text...>              inline text
  -                      read from stdin
  --input <path>         read from file

examples:
  bny spec "add user auth"
  bny spec --force-evolve "add rate limiting to the API"
  bny spec --input requirements.md
`

// -- main --

export async function main(argv: string[]): Promise<number> {
  const { text: input_text, rest_argv } = read_input(argv)

  let mode: SpecMode = "evolve"
  let dry_run = false
  let interactive = false
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
    } else if (!arg.startsWith("-")) {
      positional.push(arg)
    }
  }

  const description = input_text ?? positional.join(" ").trim()
  if (!description) {
    process.stderr.write("error: bny spec requires a description\n")
    process.stderr.write("usage: bny spec \"description\"\n")
    return 1
  }

  const root = find_root()

  if (dry_run) {
    process.stderr.write(`[bny spec] dry-run:\n`)
    process.stderr.write(`  description: ${description}\n`)
    process.stderr.write(`  mode: ${mode}\n`)
    process.stderr.write(`  1. specify (claude)\n`)
    process.stderr.write(`  2. challenge (gemini)\n`)
    return 0
  }

  return run_spec(description, root, { mode, interactive })
}

// -- exported for use by hop.ts --

export interface SpecOpts {
  mode:         SpecMode
  interactive:  boolean
}

export async function run_spec(
  description: string,
  root: string,
  opts: SpecOpts,
): Promise<number> {
  const label = `[bny spec] ${description}`
  process.stderr.write(`\n${label}\n`)
  process.stderr.write(`  mode: ${opts.mode}\n\n`)

  // -- 1. specify (claude) --

  process.stderr.write(`\n--- specify ---\n`)
  const specify_args = [description]
  if (opts.mode === "new") specify_args.push("--force-new")
  // evolve is default, no flag needed

  const specify_code = await specify_main(specify_args)
  if (specify_code !== 0) {
    process.stderr.write(`\nerror: specify failed (exit ${specify_code})\n`)
    return 1
  }

  // -- interactive checkpoint --

  if (opts.interactive) {
    const feature = current_feature()
    if (feature) {
      const paths = feature_paths(root, feature)
      process.stderr.write(`\n--- review spec ---\n`)
      process.stderr.write(`spec: ${paths.spec}\n`)
      process.stderr.write(`\nreview the spec, edit if needed, then continue.\n`)
      // note: actual tty confirm is handled by the caller (hop.ts)
      // when run standalone, interactive just prints the path
    }
  }

  // -- 2. challenge (gemini) --

  process.stderr.write(`\n--- challenge (gemini) ---\n`)
  const challenge_code = await challenge_main([])
  if (challenge_code !== 0) {
    process.stderr.write(`warning: challenge failed (exit ${challenge_code}), continuing without spec hardening\n`)
    // non-fatal — spec is still usable without hardening
  }

  process.stderr.write(`\n${label} — complete\n`)
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
