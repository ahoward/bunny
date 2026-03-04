# Existing Tools
Understanding the competitive landscape reveals what's worth building and what isn't.

## `wc` (POSIX)
- Ubiquitous, fast, minimal
- Weaknesses: no JSON output, byte/char confusion, no Unicode awareness
- 50+ years of battle-tested behavior

## `tokei` / `scc` / `cloc`
- Count lines of code, not words — but adjacent problem space
- Understand language-specific comments and blanks
- Show that "counting" tools have room for specialization

## Text editors
- Every editor shows word/line/char counts in the status bar
- They handle Unicode correctly because they must
- The bar for "good enough" is already met for interactive use

## Why Build Another?
- Learning exercise and demo project
- Specific output format needs (JSON, structured)
- Correctness guarantees that `wc` doesn't provide
- Integration into larger pipelines with typed output
