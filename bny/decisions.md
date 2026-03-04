# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-04 | `bny init` uses marker-delimited blocks instead of replacing files | guest, not landlord — append to existing files, never clobber |
| 2026-03-04 | `bny uninit` added for clean removal | fully reversible drop-in requires a way to fully reverse |
| 2026-03-04 | `bny ai init` absorbed into `bny init`, deleted `bny/ai/` | one command does everything, fewer moving parts |
| 2026-03-04 | AGENTS.md moved from `bny/` to repo root as real file | CLAUDE.md/GEMINI.md symlink to it; bny/AGENTS.md was confusing (described bny internals, not usage) |
| 2026-03-04 | 32 slash commands consolidated into single `/bny` | bny already has its own dispatcher; one command rules them all |
| 2026-03-04 | BUNNY_LOG inverted to opt-in (`BUNNY_LOG=1`) | every caller was suppressing it with `BUNNY_LOG=0`; default should match common case |
| 2026-03-04 | Tracked state lives in `bny/`, not `.bny/` | `.bny/` is runtime-only (brane, children, proposals); source repo state is tracked alongside CLI source |
