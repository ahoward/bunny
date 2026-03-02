//
// bny/lib/map_index.ts — persistent SQLite index for codebase map
//
// provides: schema, open/close, upsert, FTS5 query, focus mode, stats
// database: .bny/map/index.sqlite (gitignored)
// dependency: bun:sqlite (built into Bun, zero external deps)
//

import { Database } from "bun:sqlite"
import { existsSync, statSync, mkdirSync } from "node:fs"
import { resolve, dirname, relative } from "node:path"
import type { FileMap, MapSymbol, CodebaseMap } from "./map.ts"

// -- types --

export interface QueryResult {
  file_path:   string
  language:    string
  kind:        string
  name:        string
  signature:   string | null
  line:        number
  parent_name: string | null
  rank:        number
}

export interface FocusResult {
  files:     FocusFile[]
  query:     string
  matched:   number
}

export interface FocusFile {
  path:       string
  language:   string
  symbols:    FocusSymbol[]
  imports:    string[]
}

export interface FocusSymbol {
  kind:       string
  name:       string
  signature:  string | null
  line:       number
  children:   FocusSymbol[]
}

export interface IndexStats {
  total_files:     number
  total_symbols:   number
  total_imports:   number
  by_language:     Record<string, number>
  oldest_indexed:  string | null
  newest_indexed:  string | null
}

// -- paths --

export function index_path(root: string): string {
  return resolve(root, ".bny/map/index.sqlite")
}

// -- schema --

const SCHEMA_VERSION = 1

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS meta (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS files (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    path        TEXT NOT NULL UNIQUE,
    language    TEXT NOT NULL,
    mtime_ms    INTEGER NOT NULL,
    size        INTEGER NOT NULL,
    indexed_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS symbols (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id    INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    name       TEXT NOT NULL,
    signature  TEXT,
    line       INTEGER NOT NULL,
    parent_id  INTEGER REFERENCES symbols(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS imports (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id  INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    source   TEXT NOT NULL
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS symbols_fts USING fts5(
    name,
    signature,
    kind,
    file_path,
    content=''
  );

  CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_id);
  CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
  CREATE INDEX IF NOT EXISTS idx_symbols_parent ON symbols(parent_id);
  CREATE INDEX IF NOT EXISTS idx_imports_file ON imports(file_id);
`

// -- open / initialize --

export function open_index(root: string): Database {
  const db_path = index_path(root)
  const dir = dirname(db_path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const db = new Database(db_path)
  db.run("PRAGMA journal_mode = WAL")
  db.run("PRAGMA foreign_keys = ON")
  db.run("PRAGMA synchronous = NORMAL")

  db.exec(SCHEMA_SQL)

  const row = db.query("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value: string } | null
  if (!row) {
    db.run("INSERT INTO meta (key, value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)])
  } else if (parseInt(row.value, 10) !== SCHEMA_VERSION) {
    db.exec("DROP TABLE IF EXISTS symbols_fts")
    db.exec("DROP TABLE IF EXISTS imports")
    db.exec("DROP TABLE IF EXISTS symbols")
    db.exec("DROP TABLE IF EXISTS files")
    db.exec("DROP TABLE IF EXISTS meta")
    db.exec(SCHEMA_SQL)
    db.run("INSERT INTO meta (key, value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)])
  }

  return db
}

// -- helpers --

function remove_file_from_index(db: Database, file_id: number, file_path: string): void {
  // for contentless FTS5 tables, use the special delete command with original values
  const sym_rows = db.query(
    "SELECT id, name, COALESCE(signature, '') as signature, kind FROM symbols WHERE file_id = ?"
  ).all(file_id) as { id: number, name: string, signature: string, kind: string }[]

  for (const sr of sym_rows) {
    db.run(
      "INSERT INTO symbols_fts(symbols_fts, rowid, name, signature, kind, file_path) VALUES('delete', ?, ?, ?, ?, ?)",
      [sr.id, sr.name, sr.signature, sr.kind, file_path]
    )
  }

  db.run("DELETE FROM files WHERE id = ?", [file_id])
}

// -- upsert --

export function upsert_file(db: Database, file_map: FileMap, mtime_ms: number, size: number): void {
  const now = Date.now()

  // clean existing file + FTS entries
  const existing = db.query("SELECT id FROM files WHERE path = ?").get(file_map.path) as { id: number } | null
  if (existing) {
    remove_file_from_index(db, existing.id, file_map.path)
  }

  const file_result = db.run(
    "INSERT INTO files (path, language, mtime_ms, size, indexed_at) VALUES (?, ?, ?, ?, ?)",
    [file_map.path, file_map.language, mtime_ms, size, now]
  )
  const file_id = Number(file_result.lastInsertRowid)

  function insert_symbols(symbols: MapSymbol[], parent_id: number | null): void {
    for (const sym of symbols) {
      const sym_result = db.run(
        "INSERT INTO symbols (file_id, kind, name, signature, line, parent_id) VALUES (?, ?, ?, ?, ?, ?)",
        [file_id, sym.kind, sym.name, sym.signature, sym.line, parent_id]
      )
      const sym_id = Number(sym_result.lastInsertRowid)

      db.run(
        "INSERT INTO symbols_fts (rowid, name, signature, kind, file_path) VALUES (?, ?, ?, ?, ?)",
        [sym_id, sym.name, sym.signature ?? "", sym.kind, file_map.path]
      )

      if (sym.children.length > 0) {
        insert_symbols(sym.children, sym_id)
      }
    }
  }

  insert_symbols(file_map.symbols, null)

  for (const imp of file_map.imports) {
    db.run("INSERT INTO imports (file_id, source) VALUES (?, ?)", [file_id, imp])
  }
}

// -- persist full map --

export function persist_map(db: Database, map: CodebaseMap, root: string): void {
  db.run("BEGIN TRANSACTION")
  try {
    const current_paths = new Set(map.files.map(f => f.path))

    for (const file_map of map.files) {
      const abs_path = resolve(root, file_map.path)
      let mtime_ms = 0
      let size = 0
      try {
        const stat = statSync(abs_path)
        mtime_ms = Math.floor(stat.mtimeMs)
        size = stat.size
      } catch { /* file may have been deleted since map */ }
      upsert_file(db, file_map, mtime_ms, size)
    }

    // remove files no longer in the codebase
    const indexed = db.query("SELECT id, path FROM files").all() as { id: number, path: string }[]
    for (const row of indexed) {
      if (!current_paths.has(row.path)) {
        remove_file_from_index(db, row.id, row.path)
      }
    }

    db.run("COMMIT")
  } catch (e) {
    db.run("ROLLBACK")
    throw e
  }
}

// -- query --

export function query_index(db: Database, query: string, limit: number = 50): QueryResult[] {
  if (!query || query.trim().length === 0) return []

  const fts_query = query.trim().split(/\s+/).map(w => `"${w}"`).join(" OR ")

  const rows = db.query(`
    SELECT
      s.kind, s.name, s.signature, s.line,
      f.path AS file_path, f.language,
      p.name AS parent_name,
      rank
    FROM symbols_fts
    JOIN symbols AS s ON s.id = symbols_fts.rowid
    JOIN files AS f ON f.id = s.file_id
    LEFT JOIN symbols AS p ON p.id = s.parent_id
    WHERE symbols_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(fts_query, limit) as any[]

  return rows.map(r => ({
    file_path:   r.file_path,
    language:    r.language,
    kind:        r.kind,
    name:        r.name,
    signature:   r.signature,
    line:        r.line,
    parent_name: r.parent_name,
    rank:        r.rank,
  }))
}

export function query_by_name(db: Database, name: string): QueryResult[] {
  const rows = db.query(`
    SELECT
      s.kind, s.name, s.signature, s.line,
      f.path AS file_path, f.language,
      p.name AS parent_name,
      0 AS rank
    FROM symbols AS s
    JOIN files AS f ON f.id = s.file_id
    LEFT JOIN symbols AS p ON p.id = s.parent_id
    WHERE s.name = ?
    ORDER BY f.path, s.line
  `).all(name) as any[]

  return rows.map(r => ({
    file_path:   r.file_path,
    language:    r.language,
    kind:        r.kind,
    name:        r.name,
    signature:   r.signature,
    line:        r.line,
    parent_name: r.parent_name,
    rank:        r.rank,
  }))
}

export function query_by_kind(db: Database, kind: string): QueryResult[] {
  const rows = db.query(`
    SELECT
      s.kind, s.name, s.signature, s.line,
      f.path AS file_path, f.language,
      p.name AS parent_name,
      0 AS rank
    FROM symbols AS s
    JOIN files AS f ON f.id = s.file_id
    LEFT JOIN symbols AS p ON p.id = s.parent_id
    WHERE s.kind = ?
    ORDER BY f.path, s.line
  `).all(kind) as any[]

  return rows.map(r => ({
    file_path:   r.file_path,
    language:    r.language,
    kind:        r.kind,
    name:        r.name,
    signature:   r.signature,
    line:        r.line,
    parent_name: r.parent_name,
    rank:        r.rank,
  }))
}

// -- focus --

export function focus_query(db: Database, query: string, max_files: number = 10): FocusResult {
  const matches = query_index(db, query, 100)
  if (matches.length === 0) return { files: [], query, matched: 0 }

  // group by file
  const file_groups: Record<string, QueryResult[]> = {}
  for (const m of matches) {
    if (!file_groups[m.file_path]) file_groups[m.file_path] = []
    file_groups[m.file_path].push(m)
  }

  // sort by aggregate relevance, take top N
  const sorted_files = Object.entries(file_groups)
    .map(([path, results]) => ({
      path,
      results,
      total_rank: results.reduce((sum, r) => sum + r.rank, 0),
    }))
    .sort((a, b) => a.total_rank - b.total_rank)
    .slice(0, max_files)

  const files: FocusFile[] = sorted_files.map(({ path, results }) => {
    const file_row = db.query("SELECT id, language FROM files WHERE path = ?").get(path) as { id: number, language: string } | null
    const imports: string[] = file_row
      ? (db.query("SELECT source FROM imports WHERE file_id = ?").all(file_row.id) as { source: string }[]).map(r => r.source)
      : []

    const symbols: FocusSymbol[] = results.map(r => ({
      kind:       r.kind,
      name:       r.name,
      signature:  r.signature,
      line:       r.line,
      children:   [],
    }))

    return {
      path,
      language: file_row?.language ?? "unknown",
      symbols,
      imports,
    }
  })

  return { files, query, matched: matches.length }
}

export function format_focus_markdown(focus: FocusResult): string {
  const lines: string[] = [`# Focus: "${focus.query}"`, ""]
  lines.push(`${focus.matched} symbols matched across ${focus.files.length} files`, "")

  for (const file of focus.files) {
    lines.push(`## ${file.path} (${file.language})`)
    if (file.imports.length > 0) {
      lines.push(`imports: ${file.imports.join(", ")}`)
    }
    for (const sym of file.symbols) {
      const sig = sym.signature ? sym.signature : ""
      lines.push(`- \`${sym.kind} ${sym.name}${sig}\` (line ${sym.line})`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

// -- stats --

export function index_stats(db: Database): IndexStats {
  const file_count = (db.query("SELECT COUNT(*) as c FROM files").get() as { c: number }).c
  const sym_count = (db.query("SELECT COUNT(*) as c FROM symbols").get() as { c: number }).c
  const imp_count = (db.query("SELECT COUNT(*) as c FROM imports").get() as { c: number }).c

  const lang_rows = db.query(
    "SELECT language, COUNT(*) as c FROM files GROUP BY language ORDER BY c DESC"
  ).all() as { language: string, c: number }[]
  const by_language: Record<string, number> = {}
  for (const r of lang_rows) by_language[r.language] = r.c

  const oldest = db.query("SELECT MIN(indexed_at) as v FROM files").get() as { v: number | null }
  const newest = db.query("SELECT MAX(indexed_at) as v FROM files").get() as { v: number | null }

  return {
    total_files:    file_count,
    total_symbols:  sym_count,
    total_imports:  imp_count,
    by_language,
    oldest_indexed: oldest.v ? new Date(oldest.v).toISOString() : null,
    newest_indexed: newest.v ? new Date(newest.v).toISOString() : null,
  }
}
