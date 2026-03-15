#!/usr/bin/env bun
//
// bny brane lens — manage worldview lenses
//
// lenses are perspectives through which the brane filters information.
// the default "all" lens is always present and cannot be removed.
//
// usage:
//   bny brane lens                      # list all lenses
//   bny brane lens add <name> <desc>    # create a new lens
//   bny brane lens on <name>            # activate
//   bny brane lens off <name>           # deactivate
//   bny brane lens rm <name>            # delete
//

import { existsSync, writeFileSync, unlinkSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "../lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_state, save_state,
  list_all_lenses, lenses_dir,
} from "../lib/brane.ts"
import { read_input } from "../lib/input.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  if (argv[0] === "--help" || argv[0] === "-h") {
    process.stdout.write(`usage: bny brane lens [command] [args]

commands:
  (none)              list all lenses
  add <name> <desc>   create a new lens
  on <name>           activate a lens
  off <name>          deactivate a lens
  rm <name>           delete a lens

input (for add description):
  <text...>              inline text
  -                      read from stdin
  --input <path>         read from file
`)
    return 0
  }

  const subcmd = argv[0] && !argv[0].startsWith("-") ? argv[0] : "list"
  const rest = subcmd === "list" ? argv : argv.slice(1)

  const root = find_root()
  ensure_brane(root)

  function meta() {
    return { path: "/bny/brane/lens", timestamp: new Date().toISOString(), duration_ms: 0 }
  }

  // -- list --

  if (subcmd === "list") {
    const state = load_state(root)
    const all = list_all_lenses(root)

    if (all.length === 0) {
      process.stdout.write("no lenses\n")
      return 0
    }

    for (const name of all) {
      const active = state.active_lenses.includes(name)
      process.stdout.write(`  ${active ? "*" : " "} ${name}\n`)
    }
    return 0
  }

  // -- add --

  if (subcmd === "add") {
    const { text: input_text, rest_argv: add_rest } = read_input(rest)
    const name = add_rest[0]
    const desc = input_text ?? add_rest.slice(1).join(" ").trim()

    if (!name) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "required", message: "lens name is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    if (!desc) {
      process.stdout.write(JSON.stringify(error({ description: [{ code: "required", message: "lens description is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const path = resolve(lenses_dir(root), `${name}.md`)
    if (existsSync(path)) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "exists", message: `lens '${name}' already exists` }] }, meta()), null, 2) + "\n")
      return 1
    }

    writeFileSync(path, `# ${name}\n\n${desc}\n`)

    // auto-activate
    const state = load_state(root)
    if (!state.active_lenses.includes(name)) {
      state.active_lenses.push(name)
      save_state(root, state)
    }

    process.stdout.write(JSON.stringify(success({ action: "add", name, active: true }, meta()), null, 2) + "\n")
    return 0
  }

  // -- on --

  if (subcmd === "on") {
    const name = rest[0]
    if (!name) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "required", message: "lens name is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const path = resolve(lenses_dir(root), `${name}.md`)
    if (!existsSync(path)) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "not_found", message: `lens '${name}' does not exist` }] }, meta()), null, 2) + "\n")
      return 1
    }

    const state = load_state(root)
    if (!state.active_lenses.includes(name)) {
      state.active_lenses.push(name)
      save_state(root, state)
    }

    process.stdout.write(JSON.stringify(success({ action: "on", name }, meta()), null, 2) + "\n")
    return 0
  }

  // -- off --

  if (subcmd === "off") {
    const name = rest[0]
    if (!name) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "required", message: "lens name is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    if (name === "all") {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "forbidden", message: "cannot deactivate 'all' lens" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const state = load_state(root)
    state.active_lenses = state.active_lenses.filter(p => p !== name)
    save_state(root, state)

    process.stdout.write(JSON.stringify(success({ action: "off", name }, meta()), null, 2) + "\n")
    return 0
  }

  // -- rm --

  if (subcmd === "rm") {
    const name = rest[0]
    if (!name) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "required", message: "lens name is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    if (name === "all") {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "forbidden", message: "cannot delete 'all' lens" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const path = resolve(lenses_dir(root), `${name}.md`)
    if (!existsSync(path)) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "not_found", message: `lens '${name}' does not exist` }] }, meta()), null, 2) + "\n")
      return 1
    }

    unlinkSync(path)

    // also deactivate
    const state = load_state(root)
    state.active_lenses = state.active_lenses.filter(p => p !== name)
    save_state(root, state)

    process.stdout.write(JSON.stringify(success({ action: "rm", name }, meta()), null, 2) + "\n")
    return 0
  }

  // -- unknown --

  process.stderr.write(`bny brane lens: unknown command '${subcmd}'\n`)
  return 1
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
