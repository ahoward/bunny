#!/usr/bin/env bun
//
// bny map — structural codebase map + index via tree-sitter
//
// parses source files and extracts symbols (functions, classes, types, imports).
// persists results to a SQLite index for fast querying and AI-focused context.
// supports: typescript, javascript, ruby, python, go.
//
// usage:
//   bny map                        # full map + write index
//   bny map src/ lib/              # map specific directories
//   bny map --json                 # JSON output with Result envelope
//   bny map --no-index             # skip index write
//   bny map query <term>           # FTS search: symbol name, kind, file path
//   bny map query --kind fn <term> # filter by symbol kind
//   bny map focus <query>          # focused context for AI consumption
//   bny map focus --max-files 5 q  # limit files in focus output
//   bny map stats                  # index health
//   bny map stats --json           # machine-readable stats
//

import { find_root } from "./lib/feature.ts"
import { map_codebase, format_markdown, format_json } from "./lib/map.ts"
import { success } from "./lib/result.ts"
import {
  open_index, persist_map,
  query_index, query_by_name, query_by_kind,
  focus_query, format_focus_markdown,
  index_stats,
} from "./lib/map_index.ts"
import type { QueryResult } from "./lib/map_index.ts"

// -- subcommands --

const SUBCOMMANDS = new Set(["query", "focus", "stats"])

export async function main(argv: string[]): Promise<number> {
  // detect subcommand (first positional arg)
  const first_positional = argv.find(a => !a.startsWith("-"))
  if (first_positional && SUBCOMMANDS.has(first_positional)) {
    const sub_argv = argv.slice(argv.indexOf(first_positional) + 1)
    switch (first_positional) {
      case "query": return cmd_query(sub_argv)
      case "focus": return cmd_focus(sub_argv)
      case "stats": return cmd_stats(sub_argv)
    }
  }

  return cmd_map(argv)
}

// -- bny map (default) --

async function cmd_map(argv: string[]): Promise<number> {
  let json_mode = false
  let no_index = false
  const dirs: string[] = []

  for (const arg of argv) {
    if (arg === "--json") {
      json_mode = true
    } else if (arg === "--no-index") {
      no_index = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny map [--json] [--no-index] [directories...]

generates a structural map of the codebase using tree-sitter.
extracts exported symbols, classes, types, and imports.
persists results to a SQLite index for querying.

supports: typescript, javascript, ruby, python, go.

flags:
  --json       JSON output with Result envelope
  --no-index   skip writing to the SQLite index

subcommands:
  bny map query <term>   search the index (FTS)
  bny map focus <query>  AI-focused context from the index
  bny map stats          index health and statistics

examples:
  bny map              # map from project root + write index
  bny map src/         # map specific directory
  bny map --json       # machine-readable output
  bny map --no-index   # map without indexing
`)
      return 0
    } else if (!arg.startsWith("-")) {
      dirs.push(arg)
    }
  }

  const root = find_root()
  if (dirs.length === 0) dirs.push(".")

  const start = Date.now()
  const map = await map_codebase(root, dirs)
  const duration_ms = Date.now() - start

  // write-through to index (non-fatal)
  let index_ms = 0
  if (!no_index) {
    try {
      const idx_start = Date.now()
      const db = open_index(root)
      try {
        persist_map(db, map, root)
      } finally {
        db.close()
      }
      index_ms = Date.now() - idx_start
    } catch (e) {
      process.stderr.write(`warning: index write failed: ${e instanceof Error ? e.message : String(e)}\n`)
    }
  }

  if (json_mode) {
    const meta = { path: "/bny/map", timestamp: new Date().toISOString(), duration_ms, index_ms }
    process.stdout.write(JSON.stringify(success(map, meta), null, 2) + "\n")
  } else {
    process.stdout.write(format_markdown(map))
    const index_info = no_index ? "" : `, indexed in ${index_ms}ms`
    process.stderr.write(`\n${map.stats.total_files} files mapped in ${duration_ms}ms${index_info}\n`)
  }

  return 0
}

// -- bny map query --

function cmd_query(argv: string[]): number {
  let json_mode = false
  let kind_filter: string | null = null
  let limit = 50
  const terms: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--json") {
      json_mode = true
    } else if (arg === "--kind" && i + 1 < argv.length) {
      kind_filter = argv[++i]
    } else if (arg === "--limit" && i + 1 < argv.length) {
      const n = parseInt(argv[++i], 10)
      if (!isNaN(n) && n > 0) limit = n
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny map query [--json] [--kind <kind>] [--limit N] <term...>

search the codebase index using full-text search.
searches across symbol names, signatures, kinds, and file paths.

flags:
  --json          JSON output
  --kind <kind>   filter by symbol kind (function, class, interface, type, etc.)
  --limit N       max results (default: 50)

examples:
  bny map query handler         # find symbols matching "handler"
  bny map query --kind class    # all classes
  bny map query --json auth     # JSON output
`)
      return 0
    } else if (!arg.startsWith("-")) {
      terms.push(arg)
    }
  }

  if (terms.length === 0 && !kind_filter) {
    process.stderr.write("error: bny map query requires a search term or --kind filter\n")
    return 1
  }

  const root = find_root()
  const db = open_index(root)

  try {
    let results: QueryResult[]

    if (kind_filter && terms.length === 0) {
      results = query_by_kind(db, kind_filter)
    } else {
      const query = terms.join(" ")
      results = query_index(db, query, limit)
      if (kind_filter) {
        results = results.filter(r => r.kind === kind_filter)
      }
    }

    if (json_mode) {
      process.stdout.write(JSON.stringify(success(results), null, 2) + "\n")
    } else if (results.length === 0) {
      process.stderr.write("no symbols matching query\n")
    } else {
      for (const r of results) {
        const sig = r.signature ? r.signature : ""
        const parent = r.parent_name ? ` (in ${r.parent_name})` : ""
        process.stdout.write(`${r.file_path}:${r.line}  ${r.kind} ${r.name}${sig}${parent}\n`)
      }
      process.stderr.write(`\n${results.length} result(s)\n`)
    }
  } finally {
    db.close()
  }

  return 0
}

// -- bny map focus --

function cmd_focus(argv: string[]): number {
  let json_mode = false
  let max_files = 10
  const terms: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--json") {
      json_mode = true
    } else if (arg === "--max-files" && i + 1 < argv.length) {
      const n = parseInt(argv[++i], 10)
      if (!isNaN(n) && n > 0) max_files = n
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny map focus [--json] [--max-files N] <query...>

generate focused context for AI consumption.
searches the index and returns the most relevant files with their symbols.

flags:
  --json            JSON output
  --max-files N     max files in output (default: 10)

examples:
  bny map focus "error handling"    # focused context markdown
  bny map focus --json auth         # JSON focus output
  bny map focus --max-files 5 db    # limit to 5 most relevant files
`)
      return 0
    } else if (!arg.startsWith("-")) {
      terms.push(arg)
    }
  }

  if (terms.length === 0) {
    process.stderr.write("error: bny map focus requires a query\n")
    return 1
  }

  const root = find_root()
  const db = open_index(root)

  try {
    const query = terms.join(" ")
    const focus = focus_query(db, query, max_files)

    if (json_mode) {
      process.stdout.write(JSON.stringify(success(focus), null, 2) + "\n")
    } else if (focus.files.length === 0) {
      process.stderr.write("no files matching query\n")
    } else {
      process.stdout.write(format_focus_markdown(focus))
    }
  } finally {
    db.close()
  }

  return 0
}

// -- bny map stats --

function cmd_stats(argv: string[]): number {
  let json_mode = false

  for (const arg of argv) {
    if (arg === "--json") {
      json_mode = true
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`usage: bny map stats [--json]

show index health and statistics.

flags:
  --json    JSON output

examples:
  bny map stats          # human-readable stats
  bny map stats --json   # machine-readable stats
`)
      return 0
    }
  }

  const root = find_root()
  const db = open_index(root)

  try {
    const stats = index_stats(db)

    if (json_mode) {
      process.stdout.write(JSON.stringify(success(stats), null, 2) + "\n")
    } else {
      process.stdout.write(`index: ${root}/bny/map/index.sqlite\n`)
      process.stdout.write(`files:   ${stats.total_files}\n`)
      process.stdout.write(`symbols: ${stats.total_symbols}\n`)
      process.stdout.write(`imports: ${stats.total_imports}\n`)

      if (Object.keys(stats.by_language).length > 0) {
        const langs = Object.entries(stats.by_language)
          .sort((a, b) => b[1] - a[1])
          .map(([lang, count]) => `${lang}: ${count}`)
          .join(", ")
        process.stdout.write(`languages: ${langs}\n`)
      }

      if (stats.newest_indexed) {
        process.stdout.write(`last indexed: ${stats.newest_indexed}\n`)
      }
    }
  } finally {
    db.close()
  }

  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
