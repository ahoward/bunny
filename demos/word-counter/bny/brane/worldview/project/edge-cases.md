# Edge Cases
Word counting is deceptively complex once you leave ASCII plaintext.

## Handled in v1

- Empty file: returns 0/0/0 (not an error)
- Files with only whitespace: 0 words, correct line/char counts
- Multiple consecutive spaces: treated as single separator (whitespace-split)
- Mixed line endings: only `\n` counts as line (POSIX behavior)
- No trailing newline: last content not counted as a line (matches `wc`)

## Deferred (Known Limitations)

- CJK text without spaces: counted as single "word" per whitespace-separated block
- Grapheme clusters (emoji sequences): counted as multiple code points
- Non-breaking spaces (U+00A0): not treated as word separator by simple whitespace split
- Binary files: no detection, will produce garbage counts
- Very large files (>1GB): loaded into memory via `Bun.file().text()`

## Whitespace Ambiguity
- Multiple consecutive spaces: one separator (whitespace-split collapses them)
- Tabs, vertical tabs, form feeds — all treated as whitespace
- Zero-width spaces — not treated as separators

## Unicode Complexity
- CJK text has no spaces between words — "word count" becomes meaningless without segmentation
- Combining characters: é (1 code point) vs é (e + combining accent = 2 code points)
- Character count = code points, which may differ from visual character count

## Line Endings
- Only `\n` counts — CRLF files will show `\r` in character count
- Files with no trailing newline: last line not counted (matches `wc`)
- Files with only a trailing newline: 1 line, 0 words
