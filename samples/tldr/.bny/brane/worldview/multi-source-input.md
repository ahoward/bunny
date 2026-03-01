# Multi-Source Input Pattern

When a handler accepts content from multiple possible sources (file, URL, stdin), enforce mutual exclusion at the guard layer and normalize to a single internal representation before business logic.

## Guard: Exactly One Source

Count how many input sources were provided. Reject zero or multiple.

```typescript
const sources = [file_path, url, content].filter(Boolean)
if (sources.length === 0) return error({ input: [required("input")] })
if (sources.length > 1) return error({ input: [invalid("input", "provide exactly one of file_path, url, or content")] })
```

This guard runs after individual field validation but before any I/O. It keeps the business logic clean — by the time you reach the summarization step, you have exactly one validated text string and a source label.

## Normalize to Common Shape

Each source resolves to the same two values:

| Source | `text` | `source_label` |
|--------|--------|-----------------|
| file_path | `await Bun.file(path).text()` | file path string |
| url | `await fetch(url).text()` | URL string |
| content | param value directly | `"stdin"` or custom label |

After normalization, a single code path handles size checks, summarization, and result construction.

## CLI Auto-Detection

The CLI layer (not the handler) decides which param to send:

1. **Arg starts with `http://` or `https://`** → send as `url`
2. **Arg is `-` or no args + stdin is piped** → read stdin, send as `content`
3. **Arg is anything else** → send as `file_path`
4. **No args + TTY** → print usage

Detecting piped stdin: `!process.stdin.isTTY` — this is false when stdin is a terminal, true when piped.

## Key Insight

The handler never knows how input was provided — it just receives one of three typed params. This keeps the handler transport-agnostic and testable without subprocess spawning or stdin mocking. Tests pass params directly to `app.call`.
