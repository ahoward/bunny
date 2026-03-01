# Prototype Limitations to Watch

Things that are fine for now but will break at scale.

## Filesystem JSON Storage

- **Concurrent writes**: Last-write-wins means data loss under parallel requests
- **File size**: Loading entire dataset into memory on every read does not scale
- **No indexing**: Filtering is O(n) scan of all records
- **Mitigation path**: Swap `store.ts` for SQLite (bun:sqlite built-in) when needed

## No Authentication

- Any client can post moods as any user_email
- Acceptable for internal team prototype, not for public deployment
- user_email is trusted input — no verification it belongs to the caller

## No Rate Limiting

- A single client can flood the store with entries
- Bun.serve has no built-in rate limiting
