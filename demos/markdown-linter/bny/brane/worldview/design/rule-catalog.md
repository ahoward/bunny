# Rule Catalog
A survey of what rules a markdown linter should consider, grouped by category.

## Structural Rules
- **heading-hierarchy** — no skipping levels (h1 → h3)
- **single-h1** — only one top-level heading per document
- **heading-style** — consistent ATX (`#`) vs Setext (underline)
- **document-structure** — h1 first, then content

## Whitespace Rules
- **trailing-whitespace** — no trailing spaces (except intentional line breaks)
- **blank-lines-around-headings** — readability
- **blank-lines-around-fences** — code blocks need breathing room
- **no-multiple-blanks** — collapse consecutive blank lines
- **final-newline** — file ends with exactly one newline

## Link Rules
- **no-broken-links** — relative links resolve to existing files
- **no-bare-urls** — URLs should be in `<>` or `[]()`
- **no-empty-links** — `[text]()` with empty href
- **link-destination-valid** — well-formed URLs

## Code Rules
- **fenced-code-language** — code blocks should specify a language
- **no-inline-html** — or at least warn about it
- **consistent-fence-style** — backticks vs tildes

## List Rules
- **list-marker-style** — consistent `-` vs `*` vs `+`
- **ordered-list-prefix** — `1.` everywhere vs incrementing
- **list-indent** — consistent indentation depth

## Content Rules
- **no-duplicate-headings** — same text in multiple headings
- **max-line-length** — configurable, controversial
- **no-emphasis-as-heading** — `**bold line**` used instead of heading

## Meta Rules
- **frontmatter-schema** — validate YAML frontmatter against a schema
- **required-headings** — enforce template structure
