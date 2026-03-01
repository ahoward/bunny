# Implementation Plan: Core bookmark API

**Branch**: `007-core-bookmark-api` | **Date**: 2026-03-01 | **Spec**: specs/007-core-bookmark-api/spec.md

## Summary

Implement CRUD bookmark operations (save, list, delete) using the Bunny app.call framework with SQLite storage via bun:sqlite. Follows POD-only, guard-early patterns from the mood sample project.

## Technical Context

**Language/Version**: TypeScript, Bun runtime
**Primary Dependencies**: bun:sqlite (built-in), no external deps
**Storage**: SQLite via bun:sqlite
**Testing**: bun:test (built-in)
**Target Platform**: Local CLI / JSON API
**Project Type**: Single project
**Constraints**: Max 20 files, 500 lines per PR. No new runtime dependencies.

## Project Structure

### Source Code

```text
src/
├── app.ts                    # handler registry (framework)
├── index.ts                  # handler registration
├── lib/
│   ├── types.ts              # Bookmark, Result, Handler types
│   ├── result.ts             # success/error helpers
│   ├── log.ts                # structured logging
│   └── store.ts              # SQLite bookmark storage
└── handlers/
    ├── ping.ts               # health check
    ├── save_bookmark.ts      # POST /bookmarks
    ├── list_bookmarks.ts     # GET /bookmarks
    └── delete_bookmark.ts    # DELETE /bookmarks/:id

tests/
├── invariants.test.ts        # contract tests for all handlers
└── handlers/
    ├── save_bookmark.test.ts
    ├── list_bookmarks.test.ts
    └── delete_bookmark.test.ts
```

**Structure Decision**: Single project layout. All source in `src/`, all tests in `tests/`. SQLite db file created at runtime in `data/shelf.db`.
