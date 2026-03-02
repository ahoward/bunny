#!/usr/bin/env bun
//
// bny brane tldr — worldview outline with TL;DR synopses
//
// reads the worldview tree and extracts the one-line TL;DR from each file.
// instant, local, zero LLM calls.
//
// usage:
//   bny brane tldr              # tree with synopses
//   bny brane tldr --json       # structured output
//

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { resolve, relative } from "node:path"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, worldview_dir, load_state, list_all_povs, list_sources,
} from "../lib/brane.ts"

interface FileEntry {
  path:  string
  title: string
  tldr:  string
  lines: number
}

function extract_tldr(content: string): { title: string, tldr: string } {
  const lines = content.split("\n")

  // find H1 heading
  let title = ""
  let heading_idx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("# ")) {
      title = lines[i].slice(2).trim()
      heading_idx = i
      break
    }
  }

  if (heading_idx === -1) {
    return { title: "(untitled)", tldr: lines[0]?.trim() || "" }
  }

  // next non-empty line after heading = TL;DR
  for (let i = heading_idx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length === 0) continue
    // if it's another heading, no TL;DR found — fall back
    if (line.startsWith("#")) break
    return { title, tldr: line }
  }

  // no TL;DR line found — use first sentence of first paragraph
  for (let i = heading_idx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length === 0) continue
    if (line.startsWith("#")) continue
    const sentence = line.split(/\.\s/)[0]
    return { title, tldr: sentence + (sentence.endsWith(".") ? "" : "") }
  }

  return { title, tldr: "" }
}

function scan_worldview(dir: string, base: string): { files: FileEntry[], dirs: Set<string> } {
  const files: FileEntry[] = []
  const dirs = new Set<string>()

  function walk(d: string): void {
    if (!existsSync(d)) return
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = resolve(d, entry.name)
      if (entry.isDirectory()) {
        dirs.add(relative(base, full))
        walk(full)
      } else if (entry.name.endsWith(".md") && entry.name !== "index.md") {
        const content = readFileSync(full, "utf-8")
        const rel = relative(base, full)
        const { title, tldr } = extract_tldr(content)
        const lines = content.split("\n").length
        files.push({ path: rel, title, tldr, lines })
      }
    }
  }

  walk(dir)
  return { files, dirs }
}

export async function main(argv: string[]): Promise<number> {
  let json_mode = false

  for (const arg of argv) {
    if (arg === "--json") {
      json_mode = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny brane tldr [--json]

shows worldview outline with TL;DR synopses.
instant, local, zero LLM calls.

flags:
  --json    structured output
`)
      return 0
    }
  }

  const root = find_root()
  ensure_brane(root)

  const wv_dir = worldview_dir(root)
  const { files, dirs } = scan_worldview(wv_dir, wv_dir)

  if (files.length === 0) {
    process.stderr.write("worldview is empty — eat some information first\n")
    return 0
  }

  // povs
  const state = load_state(root)
  const all_povs = list_all_povs(root)
  const pov_info = all_povs.map(name => ({
    name,
    active: state.active_povs.includes(name),
  }))

  // sources
  const sources = list_sources(root)
  const last_source = sources.length > 0 ? sources[sources.length - 1].eaten_at.split("T")[0] : null

  if (json_mode) {
    const total_lines = files.reduce((sum, f) => sum + f.lines, 0)
    const out = {
      files,
      povs: pov_info,
      sources: { count: sources.length, last: last_source },
      stats: { files: files.length, dirs: dirs.size, total_lines },
    }
    process.stdout.write(JSON.stringify(out, null, 2) + "\n")
    return 0
  }

  // text output
  process.stdout.write(`\n🐰 brane  ${files.length} files, ${dirs.size} dirs\n\n`)

  // group by directory
  const by_dir: Record<string, FileEntry[]> = {}
  for (const f of files) {
    const parts = f.path.split("/")
    const dir_key = parts.length > 1 ? parts.slice(0, -1).join("/") : ""
    if (!by_dir[dir_key]) by_dir[dir_key] = []
    by_dir[dir_key].push(f)
  }

  // find max filename length for alignment
  const max_name = Math.max(...files.map(f => {
    const parts = f.path.split("/")
    return parts[parts.length - 1].length
  }))

  for (const dir_key of Object.keys(by_dir).sort()) {
    if (dir_key) {
      process.stdout.write(`${dir_key}/\n`)
    }
    for (const f of by_dir[dir_key]) {
      const parts = f.path.split("/")
      const filename = parts[parts.length - 1]
      const padded = filename.padEnd(max_name + 2)
      process.stdout.write(`  ${padded}${f.tldr}\n`)
    }
    process.stdout.write("\n")
  }

  // footer
  const pov_str = pov_info.map(p => `${p.name} (${p.active ? "on" : "off"})`).join(", ")
  process.stdout.write(`povs: ${pov_str}\n`)
  process.stdout.write(`sources: ${sources.length} stashed${last_source ? ` (last: ${last_source})` : ""}\n`)

  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
