#!/usr/bin/env bun
//
// bny specify — create a feature workspace
//
// creates: specs/<name>/spec.md from template
// writes bny/current-feature for downstream commands
//
// usage:
//   bny specify "Add user authentication"
//   bny specify "user auth" --number 5
//

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "./lib/result.ts"
import {
  find_root, next_feature_number, generate_branch_name,
  feature_paths, set_current_feature,
} from "./lib/feature.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  const args: string[] = []
  let number_override: number | null = null

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--number") {
      i++
      if (!argv[i]) { process.stderr.write("error: --number requires a value\n"); return 1 }
      number_override = parseInt(argv[i], 10)
      if (isNaN(number_override)) { process.stderr.write("error: --number must be a number\n"); return 1 }
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      process.stdout.write("usage: bny specify [--number N] <description>\n")
      return 0
    } else {
      args.push(argv[i])
    }
  }

  const description = args.join(" ").trim()
  if (!description) {
    process.stderr.write("usage: bny specify [--number N] <description>\n")
    return 1
  }

  // -- main --

  const root = find_root()
  const feature_num = number_override ?? next_feature_number(root)
  const suffix = generate_branch_name(description)
  const padded = String(feature_num).padStart(3, "0")
  const feature_name = `${padded}-${suffix}`

  // create spec dir + copy template
  const paths = feature_paths(root, feature_name)
  mkdirSync(paths.dir, { recursive: true })

  const template = resolve(root, "src/templates/spec-template.md")
  if (existsSync(template)) {
    const today = new Date().toISOString().slice(0, 10)
    let content = readFileSync(template, "utf-8")
    content = content.replace("[FEATURE NAME]", description)
    content = content.replace("[###-feature-name]", feature_name)
    content = content.replace("[DATE]", today)
    content = content.replace('"$ARGUMENTS"', `"${description}"`)
    writeFileSync(paths.spec, content)
  } else {
    // touch the file
    Bun.write(paths.spec, "")
  }

  // set current feature for downstream commands
  set_current_feature(root, feature_name)

  // output
  const meta = {
    path: "/bny/specify",
    timestamp: new Date().toISOString(),
    duration_ms: 0,
  }
  const result = success({
    feature_name,
    feature_num: padded,
    spec_file: paths.spec,
  }, meta)
  process.stdout.write(JSON.stringify(result, null, 2) + "\n")
  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
