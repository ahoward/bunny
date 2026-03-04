# Edge Cases
Markdown's informal spec means linters must handle ambiguity, dialect differences, and adversarial input.

## Spec Ambiguity

- CommonMark vs GFM vs original Markdown: different rules for lazy continuation, list parsing, HTML blocks
- Which spec does the linter target? Must be explicit.

## Content Inside Code Blocks

- Fenced code blocks can contain anything — linter must not flag content inside them
- Inline code can span multiple backticks — `` `foo` `` vs ``` ``foo`` ```
- Indented code blocks (4 spaces) are easy to miss

## Front Matter

- YAML front matter (`---`) is not markdown but appears in many files
- TOML front matter (`+++`) exists too
- Must skip or parse, never lint as markdown

## HTML in Markdown

- Legal per spec, but should the linter flag it?
- HTML comments used for directives (`<!-- mlint-disable -->`)
- Raw HTML blocks break structural analysis

## Unicode and Encoding

- Column counting with multi-byte characters
- RTL text in headings
- Emoji in link text (valid but column math gets weird)

## Huge Files

- Generated markdown (API docs, changelogs) can be enormous
- Need streaming or chunked processing, not load-entire-file
