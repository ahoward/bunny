//
// bny/lib/brane.ts — shared brane operations
//
// provides: paths, state, worldview/lens loading, claude calls,
//           json parsing, file operations, initialization
//

import { existsSync, readFileSync, writeFileSync, appendFileSync, readdirSync, mkdirSync, statSync, rmSync, openSync, readSync, closeSync } from "node:fs"
import { resolve, relative, dirname } from "node:path"
import type { PromptSection } from "./prompt.ts"
import { create_spinner } from "./spinner.ts"
import { check_secrets } from "./secrets.ts"
import { spawn_sync } from "./spawn.ts"

// -- types --

export interface BraneState {
  active_lenses: string[]
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

export interface StormSuggestion {
  kind:   "lens" | "question" | "source"
  value:  string
  reason: string
}

export interface StormResponse {
  operations:  FileOp[]
  reasoning:   string
  suggestions: StormSuggestion[]
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
  return resolve(root, "bny/brane")
}

export function worldview_dir(root: string): string {
  return resolve(root, "bny/brane/worldview")
}

export function lenses_dir(root: string): string {
  return resolve(root, "bny/brane/lenses")
}

export function sources_dir(root: string): string {
  return resolve(root, "bny/brane/sources")
}

export function state_path(root: string): string {
  return resolve(root, "bny/brane/state.json")
}

export function manifest_path(root: string): string {
  return resolve(root, "bny/brane/sources/manifest.json")
}

// -- state --

export function load_state(root: string): BraneState {
  const path = state_path(root)
  if (!existsSync(path)) return { active_lenses: ["all"] }
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8"))
    // migration: active_povs → active_lenses
    if (raw.active_povs && !raw.active_lenses) {
      raw.active_lenses = raw.active_povs
      delete raw.active_povs
    }
    return raw as BraneState
  } catch {
    process.stderr.write("warning: corrupted state.json, resetting to defaults\n")
    return { active_lenses: ["all"] }
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

export function load_active_lenses(root: string): PromptSection[] {
  const state = load_state(root)
  const dir = lenses_dir(root)
  const sections: PromptSection[] = []

  for (const name of state.active_lenses) {
    const path = resolve(dir, `${name}.md`)
    if (existsSync(path)) {
      const content = readFileSync(path, "utf-8").trim()
      if (content.length > 0) {
        sections.push({ heading: `lens: ${name}`, content })
      }
    }
  }

  return sections
}

export function list_all_lenses(root: string): string[] {
  const dir = lenses_dir(root)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .map(f => f.replace(/\.md$/, ""))
    .sort()
}

// -- usage logging --

export interface UsageEntry {
  timestamp:      string
  prompt_chars:   number
  response_chars: number
  duration_ms:    number
  ok:             boolean
}

function usage_path(root: string): string {
  return resolve(root, "bny/usage.jsonl")
}

function log_usage(root: string, entry: UsageEntry): void {
  try {
    appendFileSync(usage_path(root), JSON.stringify(entry) + "\n")
  } catch { /* non-fatal */ }
}

export function load_usage(root: string): UsageEntry[] {
  const path = usage_path(root)
  if (!existsSync(path)) return []
  try {
    return readFileSync(path, "utf-8")
      .trim()
      .split("\n")
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line) as UsageEntry)
  } catch {
    return []
  }
}

export function usage_summary(root: string): { calls: number, prompt_chars: number, response_chars: number, total_ms: number, errors: number } {
  const entries = load_usage(root)
  return {
    calls:          entries.length,
    prompt_chars:   entries.reduce((s, e) => s + e.prompt_chars, 0),
    response_chars: entries.reduce((s, e) => s + e.response_chars, 0),
    total_ms:       entries.reduce((s, e) => s + e.duration_ms, 0),
    errors:         entries.filter(e => !e.ok).length,
  }
}

// -- llm --

const CLAUDE_TIMEOUT_SECS = 300 // 5 minutes default; override with BNY_CLAUDE_TIMEOUT

export function call_claude(prompt: string, root: string): string | null {
  // secret detection
  if (!check_secrets(prompt, "prompt")) return null

  // strip CLAUDECODE env var so nested claude sessions work
  const env = { ...process.env }
  delete env.CLAUDECODE

  // model version pinning: --model flag or BNY_MODEL env var
  const model = env.BNY_MODEL || null
  const timeout_env = env.BNY_CLAUDE_TIMEOUT
  const timeout_parsed = timeout_env !== undefined ? parseInt(timeout_env, 10) : NaN
  const timeout_secs = !isNaN(timeout_parsed) ? timeout_parsed : CLAUDE_TIMEOUT_SECS

  const claude_args: string[] = ["-p"]
  if (model) claude_args.push("--model", model)
  claude_args.push("-")

  const start = Date.now()
  const r = spawn_sync({
    cmd: ["claude", ...claude_args],
    cwd: root,
    env,
    stdin: prompt,
    timeout: timeout_secs,
    label: "claude",
  })
  const duration_ms = Date.now() - start

  if (r.timed_out) {
    process.stderr.write(`error: claude timed out after ${timeout_secs}s\n`)
    log_usage(root, { timestamp: new Date().toISOString(), prompt_chars: prompt.length, response_chars: 0, duration_ms, ok: false })
    return null
  }

  if (!r.ok) {
    process.stderr.write(`error: claude failed: ${r.detail}\n`)
    log_usage(root, { timestamp: new Date().toISOString(), prompt_chars: prompt.length, response_chars: 0, duration_ms, ok: false })
    return null
  }
  log_usage(root, { timestamp: new Date().toISOString(), prompt_chars: prompt.length, response_chars: r.stdout.length, duration_ms, ok: true })
  return r.stdout
}

export function call_claude_with_tools(prompt: string, root: string, allowed_tools: string[], max_turns: number = 3): string | null {
  if (!check_secrets(prompt, "prompt")) return null

  const env = { ...process.env }
  delete env.CLAUDECODE

  const model = env.BNY_MODEL || null
  // tool use gets more time: 2x the normal timeout
  const base_timeout = env.BNY_CLAUDE_TIMEOUT !== undefined ? parseInt(env.BNY_CLAUDE_TIMEOUT, 10) : CLAUDE_TIMEOUT_SECS
  const timeout_secs = (isNaN(base_timeout) ? CLAUDE_TIMEOUT_SECS : base_timeout) * 2

  const claude_args: string[] = ["-p"]
  if (model) claude_args.push("--model", model)
  for (const tool of allowed_tools) claude_args.push("--allowedTools", tool)
  claude_args.push("--max-turns", String(max_turns), "-")

  const start = Date.now()
  const r = spawn_sync({
    cmd: ["claude", ...claude_args],
    cwd: root,
    env,
    stdin: prompt,
    timeout: timeout_secs,
    label: "claude (with tools)",
  })
  const duration_ms = Date.now() - start

  if (r.timed_out) {
    process.stderr.write(`error: claude (with tools) timed out after ${timeout_secs}s\n`)
    log_usage(root, { timestamp: new Date().toISOString(), prompt_chars: prompt.length, response_chars: 0, duration_ms, ok: false })
    return null
  }

  if (!r.ok) {
    process.stderr.write(`error: claude failed: ${r.detail}\n`)
    log_usage(root, { timestamp: new Date().toISOString(), prompt_chars: prompt.length, response_chars: 0, duration_ms, ok: false })
    return null
  }
  log_usage(root, { timestamp: new Date().toISOString(), prompt_chars: prompt.length, response_chars: r.stdout.length, duration_ms, ok: true })
  return r.stdout
}

export function parse_json<T>(raw: string): T | null {
  // try raw first — if LLM returned clean JSON, skip all heuristics
  try { return JSON.parse(raw.trim()) as T } catch { /* continue */ }

  let cleaned = raw.trim()

  // strip markdown fences (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json|jsonc)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "")
  }

  // try after fence strip
  try { return JSON.parse(cleaned) as T } catch { /* continue */ }

  // extract the outermost JSON object or array by matching braces/brackets
  // this avoids corrupting content when prose contains [ or /* characters
  const extracted = extract_json_block(cleaned)
  if (!extracted) return null

  // try strict parse on extracted block
  try { return JSON.parse(extracted) as T } catch { /* continue */ }

  // permissive: strip comments and trailing commas
  let permissive = extracted

  // strip single-line comments (// ...) only on lines that are pure comments
  permissive = permissive.replace(/^\s*\/\/.*$/gm, "")

  // strip trailing commas before } or ]
  permissive = permissive.replace(/,\s*([}\]])/g, "$1")

  try { return JSON.parse(permissive) as T } catch { return null }
}

// extract the first balanced JSON object {...} or array [...] from text
function extract_json_block(text: string): string | null {
  // find the first { or [ that starts a JSON structure
  let start = -1
  let open_char = ""
  let close_char = ""

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") { start = i; open_char = "{"; close_char = "}"; break }
    if (text[i] === "[") { start = i; open_char = "["; close_char = "]"; break }
  }
  if (start < 0) return null

  // walk forward, tracking nesting and string escapes
  let depth = 0
  let in_string = false
  let escape_next = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]

    if (escape_next) { escape_next = false; continue }
    if (in_string) {
      if (ch === "\\") { escape_next = true; continue }
      if (ch === '"') { in_string = false; continue }
      continue
    }
    if (ch === '"') { in_string = true; continue }

    if (ch === open_char) depth++
    else if (ch === close_char) {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }

  // unbalanced — return from start to end as best effort
  return text.slice(start)
}

// -- call_claude with JSON retry --

export function call_claude_json<T>(prompt: string, root: string, label: string): T | null {
  const raw = call_claude(prompt, root)
  if (!raw) return null

  const parsed = parse_json<T>(raw)
  if (parsed) return parsed

  // retry once with hint
  process.stderr.write("warning: failed to parse response, retrying...\n")
  const retry_prompt = prompt + "\n\nYour last response was not valid JSON. Respond with ONLY valid JSON, no markdown fences or prose."
  const retry_raw = call_claude(retry_prompt, root)
  if (!retry_raw) return null

  return parse_json<T>(retry_raw)
}

// -- file operations --

function validate_op_path(wv_dir: string, path: string): string | null {
  const target = resolve(wv_dir, path)
  const rel = relative(wv_dir, target)
  if (rel.startsWith("..") || rel === "") {
    process.stderr.write(`warning: path traversal blocked: ${path}\n`)
    return null
  }
  return target
}

export function apply_operations(root: string, ops: FileOp[]): void {
  const wv_dir = worldview_dir(root)
  for (const op of ops) {
    const target = validate_op_path(wv_dir, op.path)
    if (!target) continue
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
    const target = validate_op_path(wv_dir, op.path)
    if (!target) continue
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
  let fd: number | null = null
  try {
    fd = openSync("/dev/tty", "r")
    const n = readSync(fd, buf, 0, 64, null)
    const answer = buf.slice(0, n).toString().trim().toLowerCase()
    return answer === "" || answer === "y" || answer === "yes"
  } catch {
    process.stderr.write("warning: could not read /dev/tty, defaulting to no\n")
    return false // default to no on fd error — safe default
  } finally {
    if (fd !== null) closeSync(fd)
  }
}

// -- initialization --

const DEFAULT_LENS = `# all

Absorb broadly. Extract key concepts, relationships, and insights
from all perspectives. Note tensions and contradictions between ideas.
Organize by natural topic boundaries.
`

export function ensure_brane(root: string): void {
  const dirs = [brane_dir(root), worldview_dir(root), lenses_dir(root), sources_dir(root)]
  for (const d of dirs) mkdirSync(d, { recursive: true })

  const sp = state_path(root)
  if (!existsSync(sp)) save_state(root, { active_lenses: ["all"] })

  const all_lens = resolve(lenses_dir(root), "all.md")
  if (!existsSync(all_lens)) writeFileSync(all_lens, DEFAULT_LENS)
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

const MAX_DIR_DEPTH = 10
const MAX_DIR_CONTENT_BYTES = 5 * 1024 * 1024 // 5MB total content cap

function read_dir_recursive(dir: string, base: string, depth: number = 0, total_bytes: { n: number } = { n: 0 }): string {
  if (depth > MAX_DIR_DEPTH) return ""
  const parts: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (total_bytes.n >= MAX_DIR_CONTENT_BYTES) break
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      // skip hidden dirs, node_modules, and symlinks
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue
      if (entry.isSymbolicLink()) continue
      parts.push(read_dir_recursive(full, base, depth + 1, total_bytes))
    } else {
      // skip binary-looking files and symlinks
      if (/\.(png|jpg|gif|svg|ico|woff|ttf|eot|lock|db)$/i.test(entry.name)) continue
      if (entry.isSymbolicLink()) continue
      try {
        const content = readFileSync(full, "utf-8").trim()
        if (content.length > 0) {
          const rel = relative(base, full)
          parts.push(`--- ${rel} ---\n${content}`)
          total_bytes.n += content.length
        }
      } catch { /* skip unreadable files */ }
    }
  }
  return parts.join("\n\n")
}

// -- index regeneration --

export async function regenerate_index(root: string): Promise<void> {
  const updated_worldview = load_worldview(root)
  if (updated_worldview.length === 0) return

  const spin = create_spinner("regenerating index")

  const index_prompt = `# Worldview Files

${updated_worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")}

---

# Instructions

Generate a concise index.md that summarizes what this knowledge base contains.
Use markdown headers and bullet points. Link to files using relative paths.
Keep it scannable — someone should understand the full scope in 30 seconds.

IMPORTANT: Respond with ONLY structured markdown content. No conversational preamble,
no explanations, no "Here is..." or "It looks like..." — start directly with a markdown header.
`

  const index_raw = call_claude(index_prompt, root)
  if (index_raw) {
    const index_content = strip_index_preamble(index_raw)
    if (index_content) {
      writeFileSync(resolve(worldview_dir(root), "index.md"), index_content + "\n")
      spin.stop("🐰 regenerated index")
    } else {
      spin.stop("warning: index generation produced no valid markdown")
    }
  } else {
    spin.stop()
  }
}

// strip conversational preamble and code fences from index content
export function strip_index_preamble(raw: string): string | null {
  let content = raw.trim()

  // strip code fences anywhere in the content
  content = content.replace(/```(?:markdown)?\n?([\s\S]*?)```/g, "$1")

  // strip conversational preamble before first markdown header
  const header_idx = content.indexOf("#")
  if (header_idx < 0) return null
  if (header_idx > 0) content = content.slice(header_idx)

  content = content.trim()
  if (!content.includes("#")) return null

  return content
}

// -- storm suggestions --

export function print_storm_suggestions(suggestions: StormSuggestion[]): void {
  if (suggestions.length === 0) return

  process.stderr.write("\n[suggestions]\n")
  for (const s of suggestions) {
    const tag = s.kind.toUpperCase().padEnd(8)
    process.stderr.write(`  ${tag} ${s.value}\n`)
    process.stderr.write(`           ${s.reason}\n`)
  }
  process.stderr.write(`\n${suggestions.length} suggestion(s)\n`)
}

// -- source loading --

const SSRF_BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,
  /^\[::ffff:[\d.]+\]$/i,         // IPv6-mapped IPv4
  /^169\.254\.\d+\.\d+$/,         // link-local
  /^metadata\.google\.internal$/i, // cloud metadata
  /^\d+$/,                         // decimal IPs (e.g. 2130706433)
  /^0x[0-9a-f]+$/i,               // hex IPs (e.g. 0x7f000001)
]

const MAX_SOURCE_BYTES = 10 * 1024 * 1024 // 10MB

function is_ssrf_blocked(url: string): boolean {
  try {
    const parsed = new URL(url)
    return SSRF_BLOCKED_HOSTS.some(re => re.test(parsed.hostname))
  } catch {
    return true // unparseable URL → block
  }
}

export function load_source(source: string, root: string): { content: string, label: string } | null {
  // URL
  if (source.startsWith("http://") || source.startsWith("https://")) {
    if (is_ssrf_blocked(source)) {
      process.stderr.write(`error: blocked request to private/local address: ${source}\n`)
      return null
    }

    const curl_r = spawn_sync({
      cmd: ["curl", "-sL", "--max-time", "30", "--max-filesize", String(MAX_SOURCE_BYTES), "--proto", "=http,https", "--proto-redir", "=https", "--max-redirs", "5", source],
      cwd: root,
      label: "curl",
    })
    if (!curl_r.ok) return null
    const content = curl_r.stdout
    if (content.length === 0) return null
    if (!check_secrets(content, `source: ${source}`)) return null
    return { content, label: source }
  }

  // file or directory
  const path = resolve(root, source)
  if (!existsSync(path)) return null

  // directory — recurse
  if (statSync(path).isDirectory()) {
    const content = read_dir_recursive(path, path)
    if (content.length === 0) return null
    if (!check_secrets(content, `source: ${relative(root, path)}/`)) return null
    return { content, label: relative(root, path) + "/" }
  }

  // file
  const content = readFileSync(path, "utf-8").trim()
  if (content.length === 0) return null
  if (!check_secrets(content, `source: ${relative(root, path)}`)) return null
  return { content, label: relative(root, path) }
}
