# Scope Questions
Decisions that shape the project's identity and complexity.

## Must Answer

1. **stdin support?** — Without it, the tool can't participate in pipelines (`cat file | wc-tool`).
2. **Multiple files?** — Single file is simpler. Multiple files with totals is more useful.
3. **Flags for individual metrics?** — `-w` for words only, `-l` for lines only, etc. Or always show all?
4. **Encoding assumption?** — UTF-8 only? Or detect/accept encoding flags?

## Could Answer Later

5. **Glob patterns?** — `wc-tool src/**/*.ts` — convenient but adds complexity.
6. **Recursive directory counting?** — Aggregate stats for a whole directory tree.
7. **Streaming / large file support?** — Can it handle files larger than memory?
8. **Custom delimiters?** — Count sentences, paragraphs, or other units.
