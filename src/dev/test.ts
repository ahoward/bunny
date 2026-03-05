#!/usr/bin/env bun
// bny dev test — delegates to ./dev/test
import { resolve, dirname } from "node:path"
import { find_root } from "../lib/feature.ts"
import { spawn_async } from "../lib/spawn.ts"

export async function main(argv: string[]): Promise<number> {
  const root = find_root()
  const r = await spawn_async({
    cmd: [resolve(root, "dev/test"), ...argv],
    stdout: "inherit", stderr: "inherit", stdin: "inherit",
    label: "dev test",
  })
  return r.exit_code
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
