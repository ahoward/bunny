#!/usr/bin/env bun
// bny dev pre-flight — delegates to ./dev/pre_flight
import { resolve, dirname } from "node:path"
import { find_root } from "../lib/feature.ts"

export async function main(argv: string[]): Promise<number> {
  const root = find_root()
  const proc = Bun.spawn([resolve(root, "dev/pre_flight"), ...argv], {
    stdout: "inherit", stderr: "inherit", stdin: "inherit",
  })
  return await proc.exited
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
