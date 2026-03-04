#!/usr/bin/env bun
//
// bny digest — ingest information into the brane
//
// top-level command for feeding knowledge to the brane.
// supports file://, https://, and bare paths.
// thin wrapper over brane/eat.ts with URI scheme normalization.
//
// usage:
//   bny digest README.md                 # ingest a file
//   bny digest file://README.md          # same, with URI scheme
//   bny digest docs/                     # ingest a directory
//   bny digest https://example.com       # ingest a URL
//   bny digest --dry-run README.md       # print prompt, don't run
//

import { main as eat_main } from "./brane/eat.ts"

export async function main(argv: string[]): Promise<number> {
  const normalized = argv.map(arg => {
    if (arg.startsWith("file://")) return arg.slice(7)
    return arg
  })
  return eat_main(normalized)
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
