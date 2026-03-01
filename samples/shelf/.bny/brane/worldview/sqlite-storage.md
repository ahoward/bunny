# SQLite Storage with bun:sqlite

## Lazy Singleton Pattern

Database initialized on first access via `get_db()`. Returns cached instance on subsequent calls. Paired with `close_db()` for cleanup.

## Schema Decisions

- **UUID primary keys** as TEXT — no auto-increment, generated in application code
- **JSON arrays in TEXT columns** — tags stored as JSON string, parsed on read, stringified on write. Simple and queryable with SQLite JSON functions if needed later.
- **ISO timestamps as TEXT** — human-readable, sortable, no timezone conversion issues
- **null for absent optionals** — title and notes columns are nullable TEXT

## Store API

Thin functions over prepared statements: `save_bookmark()`, `read_bookmarks()`, `find_bookmark()`, `delete_bookmark()`, `clear_bookmarks()`. Each function owns its query. No ORM, no query builder.

## Test Isolation

`clear_bookmarks()` truncates the table in beforeEach. Same database file, clean slate per test. `close_db()` resets the singleton so tests don't leak connections.
