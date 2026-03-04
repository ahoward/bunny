#!/usr/bin/env bun
import { readFileSync, existsSync } from "fs"
import { lint } from "./lint"
import { format_diagnostics } from "./format"
import { all_rules } from "./rules/index"

function main(): number {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error("usage: mdlint <file...>")
    return 2
  }

  let all_diagnostics_count = 0
  let had_error = false

  for (const file of args) {
    if (!existsSync(file)) {
      console.error(`mdlint: ${file}: No such file`)
      had_error = true
      continue
    }

    let content: string
    try {
      content = readFileSync(file, "utf-8")
    } catch (err) {
      console.error(`mdlint: ${file}: ${err instanceof Error ? err.message : String(err)}`)
      had_error = true
      continue
    }

    const diagnostics = lint(file, content, all_rules)
    if (diagnostics.length > 0) {
      console.log(format_diagnostics(diagnostics))
      all_diagnostics_count += diagnostics.length
    }
  }

  if (had_error) return 2
  if (all_diagnostics_count > 0) return 1
  return 0
}

process.exit(main())
