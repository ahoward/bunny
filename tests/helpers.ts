// tests/helpers.ts — shared test infrastructure
//
// ensure_bny_project() — make sure the repo has the minimum bny/ runtime
//                         state needed for CLI tests to work.
// bny(...)             — spawn bny as subprocess, capture output.

import { mkdirSync, existsSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

export const ROOT = resolve(import.meta.dir, "..")

// -- project setup --

const BNY_DIRS = [
  "bny",
  "bny/brane",
  "bny/brane/worldview",
]

const BNY_FILES: Record<string, string> = {
  "bny/roadmap.md": "# Roadmap\n\n## Next\n\n## Done\n",
}

/**
 * Ensure the repo has the minimum bny/ runtime state for CLI tests.
 * Idempotent — safe to call from multiple test files.
 * Only creates files/dirs that don't already exist.
 */
export function ensure_bny_project(root: string = ROOT): void {
  for (const dir of BNY_DIRS) {
    mkdirSync(resolve(root, dir), { recursive: true })
  }
  for (const [rel, content] of Object.entries(BNY_FILES)) {
    const path = resolve(root, rel)
    if (!existsSync(path)) {
      writeFileSync(path, content)
    }
  }
}

// -- cli runner --

export function bny(...args: string[]): { stdout: string, stderr: string, exit: number } {
  const proc = Bun.spawnSync(["bun", resolve(ROOT, "bin/bny.ts"), ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: ROOT,
    env: { ...process.env, BNY_NO_SPINNER: "1" },
  })
  return {
    stdout: new TextDecoder().decode(proc.stdout).trim(),
    stderr: new TextDecoder().decode(proc.stderr).trim(),
    exit: proc.exitCode ?? 1,
  }
}
