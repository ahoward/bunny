# Error Messages
A linter's error messages are its primary teaching tool — bad messages create annoyance, good messages create understanding.

## Anatomy of a Good Lint Message

```
file.md:14:3 warning  Heading level skipped (H1 → H3)  no-heading-skip
                      Expected H2 before H3.
                      https://mlint.dev/rules/no-heading-skip
```

Components:
1. **Location**: file, line, column
2. **Severity**: error/warning
3. **What's wrong**: concise description
4. **Rule ID**: for disabling or looking up
5. **Suggestion**: what to do instead (optional but valuable)
6. **Documentation link**: full explanation with examples

## Anti-Patterns

- "Invalid markdown" — what's invalid?
- "Style violation" — which style?
- "Line too long" — how long? What's the limit?
- No rule ID — can't disable or search for it
