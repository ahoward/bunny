//
// bny/lib/feature.ts — shared feature operations
//
// provides: find_root, current_feature, feature_paths, feature_state,
//           next_feature_number, generate_branch_name, clean_name
//

import { existsSync, readdirSync } from "node:fs"
import { resolve, dirname, basename } from "node:path"

// -- types --

export interface FeaturePaths {
  dir:   string
  spec:  string
  plan:  string
  tasks: string
}

export interface FeatureState {
  name:      string
  has_spec:  boolean
  has_plan:  boolean
  has_tasks: boolean
  phase:     "none" | "specified" | "planned" | "tasked"
}

// -- root finding --

export function find_root(): string {
  // try relative to this file: bny/lib/feature.ts → project root is ../..
  let dir = dirname(new URL(import.meta.url).pathname)
  dir = resolve(dir, "../..")
  if (existsSync(resolve(dir, "bny"))) return dir

  // fallback: walk up from cwd
  dir = process.cwd()
  while (dir !== "/") {
    if (existsSync(resolve(dir, "bny"))) return dir
    dir = dirname(dir)
  }

  return process.cwd()
}

// -- feature detection --

const FEATURE_PATTERN = /^(\d{3})-.+/

export function current_feature(): string | null {
  // 1. env var
  const env = process.env.SPECIFY_FEATURE
  if (env && env.length > 0) return env

  // 2. git branch
  const proc = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"], { stdout: "pipe", stderr: "pipe" })
  if (proc.exitCode !== 0) return null

  const branch = new TextDecoder().decode(proc.stdout).trim()
  if (FEATURE_PATTERN.test(branch)) return branch

  return null
}

// -- paths --

export function feature_paths(root: string, name: string): FeaturePaths {
  const dir = resolve(root, "specs", name)
  return {
    dir,
    spec:  resolve(dir, "spec.md"),
    plan:  resolve(dir, "plan.md"),
    tasks: resolve(dir, "tasks.md"),
  }
}

// -- state --

export function feature_state(root: string, name: string): FeatureState {
  const paths = feature_paths(root, name)
  const has_spec  = existsSync(paths.spec)
  const has_plan  = existsSync(paths.plan)
  const has_tasks = existsSync(paths.tasks)

  let phase: FeatureState["phase"] = "none"
  if (has_tasks) phase = "tasked"
  else if (has_plan) phase = "planned"
  else if (has_spec) phase = "specified"

  return { name, has_spec, has_plan, has_tasks, phase }
}

// -- numbering --

function extract_feature_number(name: string): number {
  const match = name.match(/^(\d{3})/)
  return match ? parseInt(match[1], 10) : 0
}

export function next_feature_number(root: string): number {
  let highest = 0

  // scan specs/ directories
  const specs_dir = resolve(root, "specs")
  if (existsSync(specs_dir)) {
    for (const entry of readdirSync(specs_dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const n = extract_feature_number(entry.name)
        if (n > highest) highest = n
      }
    }
  }

  // scan git branches (local + remote)
  const proc = Bun.spawnSync(["git", "branch", "-a"], { stdout: "pipe", stderr: "pipe" })
  if (proc.exitCode === 0) {
    const output = new TextDecoder().decode(proc.stdout)
    for (const line of output.split("\n")) {
      // clean: "  remotes/origin/001-foo" → "001-foo"
      const clean = line.replace(/^[* ]+/, "").replace(/^remotes\/[^/]+\//, "").trim()
      if (FEATURE_PATTERN.test(clean)) {
        const n = extract_feature_number(clean)
        if (n > highest) highest = n
      }
    }
  }

  return highest + 1
}

// -- name generation --

const STOP_WORDS = new Set([
  "i", "a", "an", "the", "to", "for", "of", "in", "on", "at", "by",
  "with", "from", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "should",
  "could", "can", "may", "might", "must", "shall", "this", "that",
  "these", "those", "my", "your", "our", "their", "want", "need",
  "add", "get", "set",
])

export function clean_name(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "")
}

export function generate_branch_name(description: string): string {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w))

  if (words.length > 0) {
    const max_words = words.length === 4 ? 4 : 3
    return words.slice(0, max_words).join("-")
  }

  // fallback: clean the whole description
  const cleaned = clean_name(description)
  return cleaned.split("-").filter(Boolean).slice(0, 3).join("-")
}

// -- list all features --

export function list_features(root: string): FeatureState[] {
  const specs_dir = resolve(root, "specs")
  if (!existsSync(specs_dir)) return []

  return readdirSync(specs_dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && FEATURE_PATTERN.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => feature_state(root, e.name))
}
