#!/usr/bin/env bun
//
// bny brane pov — manage points of view
//
// povs are lenses through which the brane filters information.
// the default "all" pov is always present and cannot be removed.
//
// usage:
//   bny brane pov                      # list all povs
//   bny brane pov add <name> <desc>    # create a new pov
//   bny brane pov on <name>            # activate
//   bny brane pov off <name>           # deactivate
//   bny brane pov rm <name>            # delete
//

import { existsSync, writeFileSync, unlinkSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "../../src/lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_state, save_state,
  list_all_povs, povs_dir,
} from "../lib/brane.ts"

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  const subcmd = argv[0] && !argv[0].startsWith("-") ? argv[0] : "list"
  const rest = subcmd === "list" ? argv : argv.slice(1)

  if (subcmd === "--help" || subcmd === "-h") {
    process.stdout.write(`usage: bny brane pov [command] [args]

commands:
  (none)              list all povs
  add <name> <desc>   create a new pov
  on <name>           activate a pov
  off <name>          deactivate a pov
  rm <name>           delete a pov
`)
    return 0
  }

  const root = find_root()
  ensure_brane(root)

  function meta() {
    return { path: "/bny/brane/pov", timestamp: new Date().toISOString(), duration_ms: 0 }
  }

  // -- list --

  if (subcmd === "list") {
    const state = load_state(root)
    const all = list_all_povs(root)

    if (all.length === 0) {
      process.stdout.write("no povs\n")
      return 0
    }

    for (const name of all) {
      const active = state.active_povs.includes(name)
      process.stdout.write(`  ${active ? "*" : " "} ${name}\n`)
    }
    return 0
  }

  // -- add --

  if (subcmd === "add") {
    const name = rest[0]
    const desc = rest.slice(1).join(" ").trim()

    if (!name) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "required", message: "pov name is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    if (!desc) {
      process.stdout.write(JSON.stringify(error({ description: [{ code: "required", message: "pov description is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const path = resolve(povs_dir(root), `${name}.md`)
    if (existsSync(path)) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "exists", message: `pov '${name}' already exists` }] }, meta()), null, 2) + "\n")
      return 1
    }

    writeFileSync(path, `# ${name}\n\n${desc}\n`)

    // auto-activate
    const state = load_state(root)
    if (!state.active_povs.includes(name)) {
      state.active_povs.push(name)
      save_state(root, state)
    }

    process.stdout.write(JSON.stringify(success({ action: "add", name, active: true }, meta()), null, 2) + "\n")
    return 0
  }

  // -- on --

  if (subcmd === "on") {
    const name = rest[0]
    if (!name) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "required", message: "pov name is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const path = resolve(povs_dir(root), `${name}.md`)
    if (!existsSync(path)) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "not_found", message: `pov '${name}' does not exist` }] }, meta()), null, 2) + "\n")
      return 1
    }

    const state = load_state(root)
    if (!state.active_povs.includes(name)) {
      state.active_povs.push(name)
      save_state(root, state)
    }

    process.stdout.write(JSON.stringify(success({ action: "on", name }, meta()), null, 2) + "\n")
    return 0
  }

  // -- off --

  if (subcmd === "off") {
    const name = rest[0]
    if (!name) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "required", message: "pov name is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    if (name === "all") {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "forbidden", message: "cannot deactivate 'all' pov" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const state = load_state(root)
    state.active_povs = state.active_povs.filter(p => p !== name)
    save_state(root, state)

    process.stdout.write(JSON.stringify(success({ action: "off", name }, meta()), null, 2) + "\n")
    return 0
  }

  // -- rm --

  if (subcmd === "rm") {
    const name = rest[0]
    if (!name) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "required", message: "pov name is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    if (name === "all") {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "forbidden", message: "cannot delete 'all' pov" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const path = resolve(povs_dir(root), `${name}.md`)
    if (!existsSync(path)) {
      process.stdout.write(JSON.stringify(error({ name: [{ code: "not_found", message: `pov '${name}' does not exist` }] }, meta()), null, 2) + "\n")
      return 1
    }

    unlinkSync(path)

    // also deactivate
    const state = load_state(root)
    state.active_povs = state.active_povs.filter(p => p !== name)
    save_state(root, state)

    process.stdout.write(JSON.stringify(success({ action: "rm", name }, meta()), null, 2) + "\n")
    return 0
  }

  // -- unknown --

  process.stderr.write(`bny brane pov: unknown command '${subcmd}'\n`)
  return 1
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
