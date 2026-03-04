# Hybrid Tokenizer Pattern
Line-by-line regex matching with stateful tracking for multi-line blocks balances accuracy and simplicity.

## How It Works

1. Define named regex constants at module top (SCREAMING_SNAKE_CASE)
2. Iterate lines sequentially, maintaining state for multi-line constructs (fenced code, front matter)
3. Emit `Block` POD objects with `type`, `line_start`, `line_end`, `raw`, and `meta` dict
4. State machine is implicit: a `fence_marker` variable tracks whether we're inside a fenced block

## Why This Over Full AST

- Zero external dependencies (no remark, no markdown-it)
- ~150 lines covers headings, code blocks, lists, blockquotes, front matter, thematic breaks
- Block boundaries are sufficient for most lint rules; line-level detail comes from raw lines
- Rules receive both `blocks` (structure) and `lines` (raw text), choosing the right abstraction per rule

## Gotchas Discovered

- Front matter must be detected only at file start (line 0), not mid-document `---`
- Unclosed fences need explicit tracking via `meta.closed` flag — rules use this to report errors
- Indented code blocks (4-space) are easy to miss; they need their own detection path
- Code block awareness is critical: rules like `no-trailing-whitespace` and `no-hard-tabs` must skip lines inside code blocks

## Reusable Helper

A `lines_in_code_blocks(blocks)` function extracts line number sets for code-aware rules. This prevents each rule from re-implementing code block detection.
