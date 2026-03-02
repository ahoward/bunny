#!/usr/bin/env bun
// bny dev health — delegates to ./dev/health
import { resolve, dirname } from "node:path"
import { find_root } from "../lib/feature.ts"

export async function main(argv: string[]): Promise<number> {
  const root = find_root()
  const proc = Bun.spawn([resolve(root, "dev/health"), ...argv], {
    stdout: "inherit", stderr: "inherit", stdin: "inherit",
  })
  return await proc.exited
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
