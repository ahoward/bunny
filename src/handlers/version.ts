//
// version.ts — version + runtime info handler
//
// reports the tool's own version (from its own package.json),
// not the cwd project's version. resolves paths relative to
// this file's location, not process.cwd().
//

import { resolve, dirname } from "node:path"
import { existsSync } from "node:fs"
import type { Params, Emit } from "../lib/types.ts"
import { success } from "../lib/result.ts"

// resolve our own package.json at module load time
const own_root = resolve(dirname(import.meta.dir), "..")
const own_pkg_path = resolve(own_root, "package.json")

export async function handler(_params: Params, _emit?: Emit) {
  let version = "0.0.0"
  if (existsSync(own_pkg_path)) {
    const pkg = await Bun.file(own_pkg_path).json() as { version?: string }
    version = pkg.version ?? "0.0.0"
  }

  let git_sha: string | null = null
  try {
    const r = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], {
      cwd: own_root,
      stdout: "pipe",
      stderr: "pipe",
    })
    if (r.exitCode === 0) {
      const sha = new TextDecoder().decode(r.stdout).trim()
      if (sha.length > 0) git_sha = sha
    }
  } catch { /* not in a git repo */ }

  return success({
    version,
    git_sha,
    bun_version: Bun.version,
    platform:    process.platform,
    arch:        process.arch,
  })
}
