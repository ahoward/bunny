# Edge Cases and Boundary Conditions
A word counter's simplicity hides deep questions — most resolved by matching `wc` semantics.

## What Is a Word?

**Decision: whitespace-delimited tokens via `content.trim().split(/\s+/)`.**

- Matches `wc -w` behavior
- Hyphenated compounds count as one word
- Numbers count as words
- URLs count as one word
- Empty/whitespace-only input: zero words (guard via `trim().length === 0`)

Unicode word boundaries (UAX #29) were considered but rejected — they change counting semantics in ways users don't expect from a `wc`-like tool.

## What Is a Line?

**Decision: count `\n` characters.**

- Only `\n` counts (not `\r\n` as two, not `\r` alone)
- No trailing newline → last line doesn't increment count
- Empty file: zero lines
- File with only `\n`: one line, zero words

This matches `wc -l` exactly. The manual loop (`for` over characters checking `=== '\n'`) is faster than split/regex for large inputs.

## What Is a Character?

**Decision: UTF-8 byte count via `Buffer.byteLength(content)`.**

- Matches `wc -c` (bytes, not characters)
- "café" = 5 bytes (é is 2 bytes in UTF-8)
- Emoji and combining characters count by their byte representation
- BOM counts if present (no special handling)

This was a deliberate choice — byte counting is what Unix tools expect and what scripts rely on for offset calculations.

## File Edge Cases Handled

- Empty files: `{ lines: 0, words: 0, characters: 0 }`
- Whitespace-only files: lines counted, zero words
- Missing files: stderr error, exit 1, continue processing others
- No trailing newline: line count is one less than newline-terminated equivalent
