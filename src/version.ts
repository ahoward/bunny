#!/usr/bin/env bun
//
// bny version — print version, git sha, and runtime info as JSON
//

import "./index.ts"  // register handlers
import app from "./app.ts"

export async function main(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("usage: bny version\n\nprint version, git sha, and runtime info as JSON.\n")
    return 0
  }

  const result = await app.call("/version")
  process.stdout.write(JSON.stringify(result.result, null, 2) + "\n")
  return result.status === "success" ? 0 : 1
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
