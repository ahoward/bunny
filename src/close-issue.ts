#!/usr/bin/env bun
//
// bny close-issue — close the GH issue for a feature
//
// reads specs/<branch>/issue.txt and closes the issue with a comment.
//
// usage:
//   bny close-issue              # current feature branch
//   bny close-issue 001-auth     # explicit feature
//

import { existsSync, readFileSync } from "node:fs"
import { success, error } from "./lib/result.ts"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { spawn_sync } from "./lib/spawn.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  let target: string | null = null

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny close-issue [feature-name]\n")
      return 0
    } else if (!arg.startsWith("-")) {
      target = arg
    }
  }

  // -- resolve feature --

  const root = find_root()
  const name = target || current_feature()

  if (!name) {
    const result = error({ feature: [{ code: "not_found", message: "no feature specified and not on a feature branch" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  const paths = feature_paths(root, name)

  // -- guards --

  if (!existsSync(paths.issue)) {
    const result = error({ issue: [{ code: "missing", message: `${paths.issue} does not exist — no issue tracked for this feature` }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  const issue_number = readFileSync(paths.issue, "utf-8").trim()
  if (!issue_number) {
    const result = error({ issue: [{ code: "empty", message: "issue.txt is empty" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  // -- close issue --

  const comment = `Completed via bny implement on branch \`${name}\`.`

  const gh = spawn_sync({
    cmd: ["gh", "issue", "close", issue_number, "--comment", comment],
    cwd: root,
    label: "gh issue close",
  })

  if (!gh.ok) {
    const result = error({ gh: [{ code: "close_failed", message: gh.detail }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  // -- output --

  const meta = {
    path: "/bny/close-issue",
    timestamp: new Date().toISOString(),
    duration_ms: 0,
  }
  const result = success({ issue_number, name, closed: true }, meta)
  process.stdout.write(JSON.stringify(result, null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
