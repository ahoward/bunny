# Unix Philosophy Alignment
This tool chose to match `wc` behavior exactly — compatibility is the highest form of composability.

## Decisions Made

- **stdin support**: Yes. No args → read stdin. Essential for pipelines.
- **Multiple files**: Yes. Per-file stats + total line when 2+ files.
- **Output format**: wc-compatible 8-char padded columns. Not JSON, not TSV.
- **Error behavior**: stderr for errors, continue processing, exit 1 on any failure.

## Why Clone wc Rather Than Reimagine It

The original design question was: clone, extend, or reimagine? The answer is **clone first**.

A `wc`-compatible tool can be dropped into existing scripts without changes. Extension (flags, formats) can layer on top later without breaking the base behavior. Reimagining creates a tool nobody's scripts work with.

## Composability in Practice

```bash
# These all work because the output format matches wc:
cat file | wc-tool
wc-tool *.txt | sort -n
wc-tool src/*.ts | tail -1  # total line
```

## Principle Applied: Do One Thing Well

"One thing" = count text metrics. Lines, words, and bytes are three aspects of one thing (text measurement), not three separate things. They share the same input and are almost always wanted together.
