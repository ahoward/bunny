//
// bny/lib/brane.ts — shared brane operations
//
// provides: paths, state, worldview/pov loading, claude calls,
//           json parsing, file operations, initialization
//

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, statSync, rmSync } from "node:fs"
import { resolve, relative, dirname } from "node:path"
import type { PromptSection } from "./prompt.ts"

// -- types --

export interface BraneState {
  active_povs: string[]
}

export interface FileOp {
  action:  "create" | "update"
  path:    string
  content: string
}

export interface EatResponse {
  operations: FileOp[]
  reasoning:  string
}

export interface SourceEntry {
  label:    string
  filename: string
  eaten_at: string
  size:     number
}

export interface SourceManifest {
  sources: SourceEntry[]
}

// -- paths --

export function brane_dir(root: string): string {
  return resolve(root, ".bny/brane")
}

export function worldview_dir(root: string): string {
  return resolve(root, ".bny/brane/worldview")
}

export function povs_dir(root: string): string {
  return resolve(root, ".bny/brane/povs")
}

export function sources_dir(root: string): string {
  return resolve(root, ".bny/brane/sources")
}

export function state_path(root: string): string {
  return resolve(root, ".bny/brane/state.json")
}

export function manifest_path(root: string): string {
  return resolve(root, ".bny/brane/sources/manifest.json")
}

// -- state --

export function load_state(root: string): BraneState {
  const path = state_path(root)
  if (!existsSync(path)) return { active_povs: ["all"] }
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as BraneState
  } catch {
    return { active_povs: ["all"] }
  }
}

export function save_state(root: string, state: BraneState): void {
  writeFileSync(state_path(root), JSON.stringify(state, null, 2) + "\n")
}

// -- loading --

function read_md_files_recursive(dir: string, base: string): PromptSection[] {
  if (!existsSync(dir)) return []
  const sections: PromptSection[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      sections.push(...read_md_files_recursive(full, base))
    } else if (entry.name.endsWith(".md")) {
      const rel = relative(base, full)
      const content = readFileSync(full, "utf-8").trim()
      if (content.length > 0) {
        sections.push({ heading: rel, content })
      }
    }
  }

  return sections
}

export function load_worldview(root: string): PromptSection[] {
  const dir = worldview_dir(root)
  return read_md_files_recursive(dir, dir)
}

export function load_active_povs(root: string): PromptSection[] {
  const state = load_state(root)
  const dir = povs_dir(root)
  const sections: PromptSection[] = []

  for (const name of state.active_povs) {
    const path = resolve(dir, `${name}.md`)
    if (existsSync(path)) {
      const content = readFileSync(path, "utf-8").trim()
      if (content.length > 0) {
        sections.push({ heading: `pov: ${name}`, content })
      }
    }
  }

  return sections
}

export function list_all_povs(root: string): string[] {
  const dir = povs_dir(root)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .map(f => f.replace(/\.md$/, ""))
    .sort()
}

// -- llm --

export function call_claude(prompt: string, root: string): string | null {
  // strip CLAUDECODE env var so nested claude sessions work
  const env = { ...process.env }
  delete env.CLAUDECODE
  const proc = Bun.spawnSync(["claude", "-p", "-"], {
    stdout: "pipe",
    stderr: "pipe",
    stdin: Buffer.from(prompt),
    cwd: root,
    env,
  })
  if (proc.exitCode !== 0) {
    const err = new TextDecoder().decode(proc.stderr).trim()
    process.stderr.write(`error: claude failed: ${err}\n`)
    return null
  }
  return new TextDecoder().decode(proc.stdout).trim()
}

export function parse_json<T>(raw: string): T | null {
  let cleaned = raw.trim()
  // strip markdown fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }
  try {
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}

// -- file operations --

export function apply_operations(root: string, ops: FileOp[]): void {
  const wv_dir = worldview_dir(root)
  for (const op of ops) {
    const target = resolve(wv_dir, op.path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, op.content.trim() + "\n")
  }
}

// -- intake gate --

export interface OpDiff {
  op:        FileOp
  is_new:    boolean
  old_lines: number
  new_lines: number
  added:     number
  removed:   number
}

export function preview_operations(root: string, ops: FileOp[]): OpDiff[] {
  const wv_dir = worldview_dir(root)
  const diffs: OpDiff[] = []

  for (const op of ops) {
    const target = resolve(wv_dir, op.path)
    const new_content = op.content.trim() + "\n"
    const new_lines = new_content.split("\n").length

    if (existsSync(target)) {
      const old_content = readFileSync(target, "utf-8")
      const old_arr = old_content.split("\n")
      const new_arr = new_content.split("\n")
      const old_set = new Set(old_arr)
      const new_set = new Set(new_arr)

      let added = 0
      let removed = 0
      for (const line of new_arr) { if (!old_set.has(line)) added++ }
      for (const line of old_arr) { if (!new_set.has(line)) removed++ }

      diffs.push({ op, is_new: false, old_lines: old_arr.length, new_lines, added, removed })
    } else {
      diffs.push({ op, is_new: true, old_lines: 0, new_lines, added: new_lines, removed: 0 })
    }
  }

  return diffs
}

export function print_intake_diff(diffs: OpDiff[], reasoning: string): void {
  process.stderr.write("\n[intake]\n")

  for (const d of diffs) {
    if (d.is_new) {
      process.stderr.write(`  + ${d.op.path}  (${d.new_lines} lines)\n`)
    } else {
      process.stderr.write(`  ~ ${d.op.path}  (+${d.added}, -${d.removed})\n`)
    }
  }

  process.stderr.write(`\nreasoning: ${reasoning}\n`)

  const new_count = diffs.filter(d => d.is_new).length
  const update_count = diffs.filter(d => !d.is_new).length
  const parts: string[] = []
  if (new_count > 0) parts.push(`${new_count} new`)
  if (update_count > 0) parts.push(`${update_count} updated`)
  process.stderr.write(`\n${diffs.length} operation(s) (${parts.join(", ")})\n`)
}

export function confirm_intake(): boolean {
  // auto-confirm if not a TTY (piped input)
  if (!process.stdin.isTTY) return true

  process.stderr.write("\napply? [Y/n] ")

  const buf = Buffer.alloc(64)
  const fd = require("node:fs").openSync("/dev/tty", "r")
  const n = require("node:fs").readSync(fd, buf, 0, 64)
  require("node:fs").closeSync(fd)

  const answer = buf.slice(0, n).toString().trim().toLowerCase()
  return answer === "" || answer === "y" || answer === "yes"
}

// -- initialization --

const DEFAULT_POV = `# all

Absorb broadly. Extract key concepts, relationships, and insights
from all perspectives. Note tensions and contradictions between ideas.
Organize by natural topic boundaries.
`

export function ensure_brane(root: string): void {
  const dirs = [brane_dir(root), worldview_dir(root), povs_dir(root), sources_dir(root)]
  for (const d of dirs) mkdirSync(d, { recursive: true })

  const sp = state_path(root)
  if (!existsSync(sp)) save_state(root, { active_povs: ["all"] })

  const all_pov = resolve(povs_dir(root), "all.md")
  if (!existsSync(all_pov)) writeFileSync(all_pov, DEFAULT_POV)
}

// -- source stashing --

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

export function load_manifest(root: string): SourceManifest {
  const path = manifest_path(root)
  if (!existsSync(path)) return { sources: [] }
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as SourceManifest
  } catch {
    return { sources: [] }
  }
}

export function save_manifest(root: string, manifest: SourceManifest): void {
  const dir = sources_dir(root)
  mkdirSync(dir, { recursive: true })
  writeFileSync(manifest_path(root), JSON.stringify(manifest, null, 2) + "\n")
}

export function stash_source(root: string, label: string, content: string): SourceEntry {
  const dir = sources_dir(root)
  mkdirSync(dir, { recursive: true })

  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const slug = slugify(label)
  const filename = `${ts}-${slug}.txt`

  writeFileSync(resolve(dir, filename), content)

  const entry: SourceEntry = {
    label,
    filename,
    eaten_at: new Date().toISOString(),
    size: content.length,
  }

  const manifest = load_manifest(root)
  manifest.sources.push(entry)
  save_manifest(root, manifest)

  return entry
}

export function list_sources(root: string): SourceEntry[] {
  return load_manifest(root).sources
}

export function load_stashed_source(root: string, entry: SourceEntry): string | null {
  const path = resolve(sources_dir(root), entry.filename)
  if (!existsSync(path)) return null
  return readFileSync(path, "utf-8")
}

export function clear_worldview(root: string): void {
  const dir = worldview_dir(root)
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true })
  }
  mkdirSync(dir, { recursive: true })
}

// -- source loading --

function read_dir_recursive(dir: string, base: string): string {
  const parts: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      // skip hidden dirs and node_modules
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue
      parts.push(read_dir_recursive(full, base))
    } else {
      // skip binary-looking files
      if (/\.(png|jpg|gif|svg|ico|woff|ttf|eot|lock|db)$/i.test(entry.name)) continue
      try {
        const content = readFileSync(full, "utf-8").trim()
        if (content.length > 0) {
          const rel = relative(base, full)
          parts.push(`--- ${rel} ---\n${content}`)
        }
      } catch { /* skip unreadable files */ }
    }
  }
  return parts.join("\n\n")
}

export function load_source(source: string, root: string): { content: string, label: string } | null {
  // URL
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const proc = Bun.spawnSync(["curl", "-sL", "--max-time", "30", source], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: root,
    })
    if (proc.exitCode !== 0) return null
    const content = new TextDecoder().decode(proc.stdout).trim()
    if (content.length === 0) return null
    return { content, label: source }
  }

  // file or directory
  const path = resolve(root, source)
  if (!existsSync(path)) return null

  // directory — recurse
  if (statSync(path).isDirectory()) {
    const content = read_dir_recursive(path, path)
    if (content.length === 0) return null
    return { content, label: relative(root, path) + "/" }
  }

  // file
  const content = readFileSync(path, "utf-8").trim()
  if (content.length === 0) return null
  return { content, label: relative(root, path) }
}
