#!/usr/bin/env bun
//
// bny state — show current build pipeline state
//
// reads bny/state.md and prints it. --json for machine-readable output.
//

import { existsSync, readFileSync } from "node:fs"
import { find_root } from "./lib/feature.ts"
import { read_state, state_path } from "./lib/state.ts"

export async function main(argv: string[]): Promise<number> {
  let json_mode = false

  for (const arg of argv) {
    if (arg === "--json") {
      json_mode = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny state [--json]

show current build pipeline state.

flags:
  --json    machine-readable JSON output
`)
      return 0
    }
  }

  const root = find_root()
  const path = state_path(root)

  if (!existsSync(path)) {
    process.stdout.write("no active build state\n")
    return 0
  }

  if (json_mode) {
    const state = read_state(root)
    if (!state) {
      process.stdout.write("no active build state\n")
      return 0
    }
    process.stdout.write(JSON.stringify(state, null, 2) + "\n")
    return 0
  }

  // human-readable: just print the file
  process.stdout.write(readFileSync(path, "utf-8"))
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
