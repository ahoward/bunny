# Testing Strategy for a Linter
Linters have a unique testing challenge: the input space is infinite and edge cases are the norm.

## Test Categories

### 1. Rule Unit Tests
Each rule gets positive (should warn) and negative (should pass) markdown fixtures. These are the bread and butter.

```
fixtures/
  heading-hierarchy/
    valid/
      simple.md
      skip-allowed-in-nested.md
    invalid/
      skip-h2.md          # expected: line 3, warning
      skip-multiple.md     # expected: lines 3, 7
```

### 2. Parser Fidelity Tests
Does the parser handle edge cases?
- Headings inside code blocks (should be ignored)
- HTML comments containing markdown syntax
- Nested blockquotes with headings
- CRLF vs LF line endings

### 3. Integration Tests
CLI invocation: given a file, does the tool produce the expected output and exit code?

### 4. Snapshot Tests
For complex output formatting, snapshot the full diagnostic output and diff against known-good.

### 5. Fuzz Testing (aspirational)
Generate random markdown and ensure the linter never crashes. Not MVP but valuable for robustness.

## The Antagonistic Angle

Gemini reviewing tests should ask:
- What markdown syntax did you forget exists?
- What happens with empty files? Files with only whitespace?
- What about files that aren't valid UTF-8?
- What about markdown that's technically valid but adversarial?
