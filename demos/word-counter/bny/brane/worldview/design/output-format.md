# Output Format Design
The output format mirrors `wc` exactly — proven composability beats novelty.

## Chosen Format: wc-Compatible Aligned Columns

8-character right-padded numeric columns followed by a space and label:

```
       2       9      44 file.txt
```

**Why this over alternatives:**
- Tab-separated: harder to eyeball, no precedent
- JSON: verbose for a tool meant to live in pipelines
- One-stat-per-line: breaks `wc` muscle memory

Matching `wc` means every script and tutorial that works with `wc` output works with this tool. The format function is three `padStart(8)` calls — trivial to implement, zero ambiguity.

## Multiple Files

- Per-file line with filename as label
- "total" line appended only when 2+ files (matches `wc` behavior)
- Missing files print to stderr, processing continues, exit code becomes 1

## stdin

- No file args → read stdin
- Output uses empty label (no filename)
- Enables pipeline composition: `cat file | wc-tool`

## Exit Codes

- 0: all files processed successfully
- 1: one or more files not found (partial results still printed)

Partial output on failure follows Unix convention — let the caller decide what to do with partial data.
