//
// cache.ts - content-addressed result cache
//
// hashes text content with SHA-256, stores/retrieves JSON results
// from ~/.cache/tldr/{hash}.json
//

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { createHash } from "node:crypto"

const CACHE_DIR_NAME = ".cache/tldr"

export function cache_dir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "/tmp"
  return join(home, CACHE_DIR_NAME)
}

export function content_hash(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

export function cache_get(hash: string): Record<string, unknown> | null {
  const path = join(cache_dir(), `${hash}.json`)
  if (!existsSync(path)) return null

  try {
    const raw = readFileSync(path, "utf-8")
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

export function cache_set(hash: string, data: Record<string, unknown>): void {
  const dir = cache_dir()

  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const path = join(dir, `${hash}.json`)
    writeFileSync(path, JSON.stringify(data), "utf-8")
  } catch {
    // cache write failures are silent — caching is best-effort
  }
}
