# Parser Strategy
The hybrid approach — regex patterns for block detection, raw lines for formatting checks — proved correct for a lightweight linter.

## Implemented: Hybrid Line-by-Line Tokenizer

The tokenizer processes markdown line-by-line using named regex constants:

- `HEADING_RE`, `FENCED_CODE_OPEN_RE`, `LIST_ITEM_RE`, `BLOCKQUOTE_RE`, `THEMATIC_BREAK_RE`, `FRONT_MATTER_RE`
- Stateful tracking for multi-line constructs (fenced code blocks, front matter)
- Outputs `Block[]` with type, line range, raw content, and metadata

## What Worked

- ~150 lines covers all needed block types
- Zero external parser dependencies
- Rules get both structural (`blocks`) and textual (`lines`) views
- Fast enough for any practical file size with line-by-line iteration

## What Required Care

- Front matter detection must check position (line 0 only)
- Unclosed fence tracking via `meta.closed` flag
- Code block line extraction needed as shared helper for formatting rules
- Indented code blocks (4-space prefix) needed separate detection

## Rejected Alternatives

- **Full AST (remark/unified)**: Too heavy for a lightweight CLI; adds dependency complexity
- **Pure regex**: Would miss multi-line constructs and produce false positives inside code blocks

## Future Considerations

- If nested block support is needed (lists containing code blocks), the tokenizer will need recursive descent
- Inline parsing (emphasis, links) is not needed for current rules but would require a second pass
