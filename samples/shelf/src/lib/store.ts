//
// store.ts - SQLite store for bookmarks
//
// uses bun:sqlite (built-in). creates db and table on first access.
// stores tags as JSON array string in a TEXT column.
//

import { Database } from "bun:sqlite"
import { join } from "path"
import type { Bookmark } from "./types.ts"

const DATA_DIR = join(import.meta.dir, "../../data")
const DB_PATH = join(DATA_DIR, "shelf.db")

let _db: Database | null = null

function get_db(): Database {
  if (_db) return _db

  const { mkdirSync } = require("fs")
  mkdirSync(DATA_DIR, { recursive: true })

  _db = new Database(DB_PATH)
  _db.run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id         TEXT PRIMARY KEY,
      url        TEXT NOT NULL,
      title      TEXT,
      tags       TEXT NOT NULL DEFAULT '[]',
      notes      TEXT,
      created_at TEXT NOT NULL
    )
  `)
  return _db
}

type BookmarkRow = {
  id: string; url: string; title: string | null; tags: string; notes: string | null; created_at: string
}

function parse_row(row: BookmarkRow): Bookmark {
  return { ...row, tags: JSON.parse(row.tags) as string[] }
}

export function read_bookmarks(): Bookmark[] {
  const db = get_db()
  const rows = db.query("SELECT * FROM bookmarks ORDER BY created_at DESC").all() as BookmarkRow[]
  return rows.map(parse_row)
}

export function search_bookmarks(filters: { tag?: string | null; q?: string | null }): Bookmark[] {
  const db = get_db()
  const conditions: string[] = []
  const params: string[] = []

  if (filters.tag) {
    conditions.push("EXISTS (SELECT 1 FROM json_each(bookmarks.tags) WHERE value = ?)")
    params.push(filters.tag)
  }

  if (filters.q) {
    const pattern = `%${filters.q}%`
    conditions.push("(url LIKE ? COLLATE NOCASE OR title LIKE ? COLLATE NOCASE OR notes LIKE ? COLLATE NOCASE OR tags LIKE ? COLLATE NOCASE)")
    params.push(pattern, pattern, pattern, pattern)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const sql = `SELECT * FROM bookmarks ${where} ORDER BY created_at DESC`
  const rows = db.query(sql).all(...params) as BookmarkRow[]
  return rows.map(parse_row)
}

export function save_bookmark(bookmark: Bookmark): void {
  const db = get_db()
  db.run(
    "INSERT INTO bookmarks (id, url, title, tags, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [bookmark.id, bookmark.url, bookmark.title, JSON.stringify(bookmark.tags), bookmark.notes, bookmark.created_at]
  )
}

export function find_bookmark(id: string): Bookmark | null {
  const db = get_db()
  const row = db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as {
    id: string; url: string; title: string | null; tags: string; notes: string | null; created_at: string
  } | null
  if (!row) return null
  return { ...row, tags: JSON.parse(row.tags) as string[] }
}

export function delete_bookmark(id: string): boolean {
  const db = get_db()
  const result = db.run("DELETE FROM bookmarks WHERE id = ?", [id])
  return result.changes > 0
}

export function clear_bookmarks(): void {
  const db = get_db()
  db.run("DELETE FROM bookmarks")
}

export function close_db(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
