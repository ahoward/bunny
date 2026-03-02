#!/usr/bin/env bun
//
// bny review — antagonist review via gemini (or prompt-only mode)
//
// shells out to gemini with a review prompt built from spec/plan/tasks.
// use --prompt-only to write the prompt to a file instead.
//
// usage:
//   bny review                    # current feature, shells out to gemini
//   bny review 001-auth           # explicit feature
//   bny review --prompt-only      # writes review-prompt.md instead
//

import { existsSync, unlinkSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "../src/lib/result.ts"
import { find_root, current_feature, feature_paths } from "./lib/feature.ts"
import { read_section, build_prompt } from "./lib/prompt.ts"
import * as assassin from "./lib/assassin.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  let target: string | null = null
  let prompt_only = false

  for (const arg of argv) {
    if (arg === "--prompt-only") {
      prompt_only = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny review [--prompt-only] [feature-name]\n")
      process.stdout.write("\nshells out to gemini -p with an antagonist review prompt.\n")
      process.stdout.write("--prompt-only writes review-prompt.md instead of invoking gemini.\n")
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

  if (!existsSync(paths.spec)) {
    const result = error({ spec: [{ code: "missing", message: `${paths.spec} does not exist — run bny specify first` }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  // -- build review prompt --

  const sections = [
    read_section("Feature Specification", paths.spec),
    read_section("Implementation Plan", paths.plan),
    read_section("Task List", paths.tasks),
  ].filter((s): s is NonNullable<typeof s> => s !== null)

  const instructions = [
    "You are the ANTAGONIST reviewer. Your job is to find problems the implementer will miss.",
    "",
    "Review the above specification and plan for:",
    "1. Missing edge cases and boundary conditions",
    "2. Security vulnerabilities and attack vectors",
    "3. Error handling gaps (what happens when things fail?)",
    "4. Missing test scenarios",
    "5. Ambiguous or contradictory requirements",
    "6. Performance concerns at scale",
    "7. Assumptions that should be made explicit",
    "8. Data validation gaps",
    "",
    "For each issue found, state:",
    "- **Problem**: What is wrong or missing",
    "- **Impact**: Why it matters (severity: critical/high/medium/low)",
    "- **Fix**: A concrete, actionable suggestion",
    "",
    "Do NOT rubber-stamp. If you find nothing wrong, look harder.",
    "A review that finds zero issues is a failed review.",
  ].join("\n")

  const prompt = build_prompt(sections, instructions)

  // -- prompt-only mode --

  if (prompt_only) {
    const prompt_file = resolve(paths.dir, "review-prompt.md")
    await Bun.write(prompt_file, prompt)

    const meta = {
      path: "/bny/review",
      timestamp: new Date().toISOString(),
      duration_ms: 0,
    }
    const result = success({ feature: name, prompt_file }, meta)
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 0
  }

  // -- shell out to gemini via bash (Bun.spawn hangs calling CLIs directly) --

  const gemini_check = Bun.spawnSync(["which", "gemini"], { stdout: "pipe", stderr: "pipe" })
  if (gemini_check.exitCode !== 0) {
    const result = error({ gemini: [{ code: "not_found", message: "gemini CLI not found on PATH — use --prompt-only to generate the prompt file instead" }] })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    return 1
  }

  assassin.install(resolve(root, ".bny"))

  const prompt_tmp = resolve(root, ".bny/review-prompt.tmp")
  await Bun.write(prompt_tmp, prompt)

  const proc = Bun.spawn(
    ["bash", "-c", `gemini -p - < "${prompt_tmp}"`],
    {
      stdout: "inherit",
      stderr: "inherit",
      cwd:    root,
    },
  )

  assassin.track(proc.pid, proc.pid)
  const exit_code = await proc.exited
  assassin.untrack(proc.pid)

  try { unlinkSync(prompt_tmp) } catch {}

  return exit_code
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
