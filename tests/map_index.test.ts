import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { Database } from "bun:sqlite"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

import {
  open_index, persist_map, upsert_file,
  query_index, query_by_name, query_by_kind,
  focus_query, format_focus_markdown,
  index_stats, index_path,
} from "../src/lib/map_index.ts"
import type { FileMap, CodebaseMap } from "../src/lib/map.ts"

// -- fixtures --

function make_file_map(overrides: Partial<FileMap> = {}): FileMap {
  return {
    path: overrides.path ?? "src/handlers/auth.ts",
    language: overrides.language ?? "typescript",
    imports: overrides.imports ?? ["./lib/result", "node:crypto"],
    symbols: overrides.symbols ?? [
      {
        kind: "function",
        name: "handle_login",
        signature: "(req: Request): Promise<Response>",
        line: 10,
        children: [],
      },
      {
        kind: "function",
        name: "handle_logout",
        signature: "(req: Request): Promise<Response>",
        line: 25,
        children: [],
      },
      {
        kind: "interface",
        name: "AuthConfig",
        signature: null,
        line: 3,
        children: [
          {
            kind: "method",
            name: "secret",
            signature: ": string",
            line: 4,
            children: [],
          },
          {
            kind: "method",
            name: "ttl",
            signature: ": number",
            line: 5,
            children: [],
          },
        ],
      },
    ],
  }
}

function make_second_file(): FileMap {
  return {
    path: "src/lib/result.ts",
    language: "typescript",
    imports: [],
    symbols: [
      {
        kind: "type",
        name: "Result",
        signature: "<T>",
        line: 1,
        children: [],
      },
      {
        kind: "function",
        name: "success",
        signature: "<T>(data: T): Result<T>",
        line: 5,
        children: [],
      },
      {
        kind: "function",
        name: "failure",
        signature: "(error: string): Result<never>",
        line: 10,
        children: [],
      },
    ],
  }
}

function make_codebase_map(files?: FileMap[]): CodebaseMap {
  const file_list = files ?? [make_file_map(), make_second_file()]
  const by_language: Record<string, number> = {}
  for (const f of file_list) {
    by_language[f.language] = (by_language[f.language] || 0) + 1
  }
  return {
    files: file_list,
    stats: { total_files: file_list.length, by_language },
  }
}

// -- tests --

let tmp_dir: string
let db: Database

beforeEach(() => {
  tmp_dir = mkdtempSync(join(tmpdir(), "bny-map-test-"))
  db = open_index(tmp_dir)
})

afterEach(() => {
  db.close()
  rmSync(tmp_dir, { recursive: true, force: true })
})

describe("open_index", () => {
  test("creates database file", () => {
    const path = index_path(tmp_dir)
    expect(Bun.file(path).size).toBeGreaterThan(0)
  })

  test("schema is idempotent", () => {
    const db2 = open_index(tmp_dir)
    db2.close()
    // no error = success
  })

  test("sets schema version", () => {
    const row = db.query("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value: string }
    expect(row.value).toBe("1")
  })

  test("creates required tables", () => {
    const tables = db.query(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[]
    const names = tables.map(t => t.name)
    expect(names).toContain("files")
    expect(names).toContain("symbols")
    expect(names).toContain("imports")
    expect(names).toContain("meta")
  })
})

describe("upsert_file", () => {
  test("inserts file with symbols and imports", () => {
    const fm = make_file_map()
    upsert_file(db, fm, 1000, 500)

    const file = db.query("SELECT * FROM files WHERE path = ?").get(fm.path) as any
    expect(file).toBeTruthy()
    expect(file.language).toBe("typescript")
    expect(file.mtime_ms).toBe(1000)
    expect(file.size).toBe(500)

    const syms = db.query("SELECT * FROM symbols WHERE file_id = ?").all(file.id) as any[]
    // 3 top-level + 2 children = 5
    expect(syms.length).toBe(5)

    const imps = db.query("SELECT * FROM imports WHERE file_id = ?").all(file.id) as any[]
    expect(imps.length).toBe(2)
  })

  test("upsert replaces existing file", () => {
    const fm = make_file_map()
    upsert_file(db, fm, 1000, 500)
    upsert_file(db, fm, 2000, 600)

    const files = db.query("SELECT * FROM files WHERE path = ?").all(fm.path) as any[]
    expect(files.length).toBe(1)
    expect(files[0].mtime_ms).toBe(2000)
    expect(files[0].size).toBe(600)

    // symbols should not be duplicated
    const total_syms = (db.query("SELECT COUNT(*) as c FROM symbols").get() as any).c
    expect(total_syms).toBe(5)
  })

  test("child symbols have parent_id set", () => {
    upsert_file(db, make_file_map(), 1000, 500)

    const parent = db.query("SELECT id FROM symbols WHERE name = 'AuthConfig'").get() as any
    const children = db.query("SELECT * FROM symbols WHERE parent_id = ?").all(parent.id) as any[]
    expect(children.length).toBe(2)
    expect(children.map((c: any) => c.name).sort()).toEqual(["secret", "ttl"])
  })
})

describe("persist_map", () => {
  test("persists all files from a CodebaseMap", () => {
    const map = make_codebase_map()
    persist_map(db, map, tmp_dir)

    const stats = index_stats(db)
    expect(stats.total_files).toBe(2)
    expect(stats.total_symbols).toBe(8)  // 5 from auth + 3 from result
    expect(stats.total_imports).toBe(2)
    expect(stats.by_language["typescript"]).toBe(2)
  })

  test("removes files no longer in map", () => {
    const map = make_codebase_map()
    persist_map(db, map, tmp_dir)
    expect(index_stats(db).total_files).toBe(2)

    // second persist with only one file
    const map2 = make_codebase_map([make_file_map()])
    persist_map(db, map2, tmp_dir)

    expect(index_stats(db).total_files).toBe(1)
    const files = db.query("SELECT path FROM files").all() as any[]
    expect(files[0].path).toBe("src/handlers/auth.ts")
  })
})

describe("query_index (FTS)", () => {
  beforeEach(() => {
    persist_map(db, make_codebase_map(), tmp_dir)
  })

  test("finds symbols by name", () => {
    const results = query_index(db, "handle_login")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe("handle_login")
    expect(results[0].file_path).toBe("src/handlers/auth.ts")
  })

  test("finds symbols by file path fragment", () => {
    const results = query_index(db, "result")
    const names = results.map(r => r.name)
    expect(names).toContain("Result")
  })

  test("finds by kind", () => {
    const results = query_index(db, "interface")
    expect(results.some(r => r.name === "AuthConfig")).toBe(true)
  })

  test("empty query returns empty", () => {
    expect(query_index(db, "")).toEqual([])
    expect(query_index(db, "   ")).toEqual([])
  })

  test("no match returns empty", () => {
    expect(query_index(db, "zzz_nonexistent_xyz")).toEqual([])
  })

  test("respects limit", () => {
    const results = query_index(db, "function", 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })
})

describe("query_by_name", () => {
  beforeEach(() => {
    persist_map(db, make_codebase_map(), tmp_dir)
  })

  test("exact match on symbol name", () => {
    const results = query_by_name(db, "success")
    expect(results.length).toBe(1)
    expect(results[0].file_path).toBe("src/lib/result.ts")
    expect(results[0].kind).toBe("function")
    expect(results[0].line).toBe(5)
  })

  test("no match returns empty", () => {
    expect(query_by_name(db, "nonexistent")).toEqual([])
  })
})

describe("query_by_kind", () => {
  beforeEach(() => {
    persist_map(db, make_codebase_map(), tmp_dir)
  })

  test("filters by kind", () => {
    const results = query_by_kind(db, "interface")
    expect(results.length).toBe(1)
    expect(results[0].name).toBe("AuthConfig")
  })

  test("returns all matches", () => {
    const results = query_by_kind(db, "function")
    expect(results.length).toBe(4) // handle_login, handle_logout, success, failure
  })
})

describe("focus_query", () => {
  beforeEach(() => {
    persist_map(db, make_codebase_map(), tmp_dir)
  })

  test("returns grouped results by file", () => {
    const focus = focus_query(db, "handle")
    expect(focus.query).toBe("handle")
    expect(focus.matched).toBeGreaterThan(0)
    expect(focus.files.length).toBeGreaterThan(0)
    expect(focus.files[0].path).toBe("src/handlers/auth.ts")
    expect(focus.files[0].symbols.length).toBeGreaterThan(0)
  })

  test("includes imports in focus results", () => {
    const focus = focus_query(db, "handle_login")
    const auth_file = focus.files.find(f => f.path === "src/handlers/auth.ts")
    expect(auth_file).toBeTruthy()
    expect(auth_file!.imports).toContain("./lib/result")
    expect(auth_file!.imports).toContain("node:crypto")
  })

  test("respects max_files", () => {
    const focus = focus_query(db, "function", 1)
    expect(focus.files.length).toBeLessThanOrEqual(1)
  })

  test("no match returns empty", () => {
    const focus = focus_query(db, "zzz_nonexistent")
    expect(focus.files).toEqual([])
    expect(focus.matched).toBe(0)
  })
})

describe("format_focus_markdown", () => {
  test("produces readable markdown", () => {
    persist_map(db, make_codebase_map(), tmp_dir)
    const focus = focus_query(db, "handle_login")
    const md = format_focus_markdown(focus)

    expect(md).toContain("# Focus:")
    expect(md).toContain("handle_login")
    expect(md).toContain("src/handlers/auth.ts")
    expect(md).toContain("(typescript)")
  })
})

describe("index_stats", () => {
  test("returns zeros for empty index", () => {
    const stats = index_stats(db)
    expect(stats.total_files).toBe(0)
    expect(stats.total_symbols).toBe(0)
    expect(stats.total_imports).toBe(0)
    expect(stats.oldest_indexed).toBeNull()
    expect(stats.newest_indexed).toBeNull()
  })

  test("returns correct counts after persist", () => {
    persist_map(db, make_codebase_map(), tmp_dir)
    const stats = index_stats(db)
    expect(stats.total_files).toBe(2)
    expect(stats.total_symbols).toBe(8)
    expect(stats.total_imports).toBe(2)
    expect(stats.by_language["typescript"]).toBe(2)
    expect(stats.oldest_indexed).toBeTruthy()
    expect(stats.newest_indexed).toBeTruthy()
  })
})

// -- CLI integration tests --

function bny(...args: string[]): { stdout: string, stderr: string, exit: number } {
  const proc = Bun.spawnSync(["bun", "bin/bny.ts", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: import.meta.dir + "/..",
    env: { ...process.env, BNY_NO_SPINNER: "1" },
  })
  return {
    stdout: new TextDecoder().decode(proc.stdout).trim(),
    stderr: new TextDecoder().decode(proc.stderr).trim(),
    exit: proc.exitCode ?? 1,
  }
}

describe("CLI: bny map subcommands", () => {
  test("bny map --help exits 0", () => {
    const r = bny("map", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("bny map")
    expect(r.stdout).toContain("--no-index")
  })

  test("bny map query --help exits 0", () => {
    const r = bny("map", "query", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("search the codebase index")
  })

  test("bny map focus --help exits 0", () => {
    const r = bny("map", "focus", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("focused context")
  })

  test("bny map stats --help exits 0", () => {
    const r = bny("map", "stats", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("index health")
  })

  test("bny map query with no term exits 1", () => {
    const r = bny("map", "query")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("requires a search term")
  })

  test("bny map focus with no query exits 1", () => {
    const r = bny("map", "focus")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("requires a query")
  })
})
