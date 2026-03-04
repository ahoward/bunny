Run `bny digest $ARGUMENTS` and report the result.

Ingest a file, directory, or URL into the brane (knowledge graph).
Supports file:// URI scheme for files.

Common usage:
- `bny digest README.md` — ingest a file
- `bny digest file://README.md` — same, with URI scheme
- `bny digest docs/` — ingest a directory recursively
- `bny digest https://example.com` — ingest a URL
- `bny digest --dry-run README.md` — show prompt, don't call claude
- `bny digest --yes README.md` — skip confirmation

Show the intake diff and result to the user.
