#!/usr/bin/env bun
//
// bny status — show current feature state
//
// usage:
//   bny status              # current feature or all features
//   bny status 001-auth     # specific feature
//   bny status --json       # machine-readable output
//

import { existsSync, readdirSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { success } from "../src/lib/result.ts"
import {
  find_root, current_feature, feature_state, list_features,
} from "./lib/feature.ts"
import { worldview_dir, usage_summary } from "./lib/brane.ts"

export async function main(argv: string[]): Promise<number> {
  let json_mode = false
  let target: string | null = null

  for (const arg of argv) {
    if (arg === "--json") json_mode = true
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny status [--json] [feature-name]\n")
      return 0
    } else {
      target = arg
    }
  }

  const root = find_root()
  const name = target || current_feature()

  // -- single feature --

  if (name) {
    const state = feature_state(root, name)

    if (json_mode) {
      const meta = { path: "/bny/status", timestamp: new Date().toISOString(), duration_ms: 0 }
      process.stdout.write(JSON.stringify(success(state, meta), null, 2) + "\n")
    } else {
      const check = (ok: boolean) => ok ? "[x]" : "[ ]"
      process.stdout.write(`feature: ${state.name}\n`)
      process.stdout.write(`phase:   ${state.phase}\n`)
      if (state.issue_number) {
        process.stdout.write(`issue:   #${state.issue_number}\n`)
      }
      process.stdout.write(`\n`)
      process.stdout.write(`  ${check(state.has_spec)} spec.md\n`)
      process.stdout.write(`  ${check(state.has_plan)} plan.md\n`)
      process.stdout.write(`  ${check(state.has_tasks)} tasks.md\n`)
    }
    return 0
  }

  // -- all features --

  const features = list_features(root)

  if (features.length === 0) {
    if (json_mode) {
      const meta = { path: "/bny/status", timestamp: new Date().toISOString(), duration_ms: 0 }
      process.stdout.write(JSON.stringify(success({ features: [] }, meta), null, 2) + "\n")
    } else {
      process.stdout.write("no features found\n")
    }
    return 0
  }

  // -- brane stats --

  const wv_dir = worldview_dir(root)
  let brane_files = 0
  let brane_bytes = 0

  function count_dir(dir: string): void {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        count_dir(full)
      } else if (entry.name.endsWith(".md")) {
        brane_files++
        brane_bytes += statSync(full).size
      }
    }
  }
  count_dir(wv_dir)

  const BRANE_WARN_BYTES = 500_000 // 500KB
  const brane_warn = brane_bytes > BRANE_WARN_BYTES

  // -- usage stats --

  const usage = usage_summary(root)

  if (json_mode) {
    const meta = { path: "/bny/status", timestamp: new Date().toISOString(), duration_ms: 0 }
    process.stdout.write(JSON.stringify(success({ features, brane: { files: brane_files, bytes: brane_bytes, warn: brane_warn }, usage }, meta), null, 2) + "\n")
  } else {
    for (const f of features) {
      const pad = f.phase.padEnd(9)
      const issue = f.issue_number ? ` issue:#${f.issue_number}` : ""
      process.stdout.write(`${f.name}  ${pad}  spec:${f.has_spec ? "+" : "-"} plan:${f.has_plan ? "+" : "-"} tasks:${f.has_tasks ? "+" : "-"}${issue}\n`)
    }

    // brane
    if (brane_files > 0) {
      const kb = (brane_bytes / 1024).toFixed(1)
      process.stdout.write(`\nbrane: ${brane_files} files, ${kb}KB`)
      if (brane_warn) process.stdout.write(` (warning: exceeds ${(BRANE_WARN_BYTES / 1024).toFixed(0)}KB — consider brane digest)`)
      process.stdout.write("\n")
    }

    // usage
    if (usage.calls > 0) {
      const mins = (usage.total_ms / 60_000).toFixed(1)
      const prompt_kb = (usage.prompt_chars / 1024).toFixed(0)
      const resp_kb = (usage.response_chars / 1024).toFixed(0)
      process.stdout.write(`usage: ${usage.calls} calls, ${mins}min, ${prompt_kb}KB sent, ${resp_kb}KB received`)
      if (usage.errors > 0) process.stdout.write(`, ${usage.errors} errors`)
      process.stdout.write("\n")
    }
  }
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
