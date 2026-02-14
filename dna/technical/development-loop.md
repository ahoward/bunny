# Development Loop: Antagonistic Testing

## The Loop

1. **Design Interface** — Define public API
2. **Design Tests (Claude)** — Write test cases
3. **Review Tests (Gemini)** — Antagonist review, incorporate suggestions
4. **Implement** — Write code
5. **Loop Until Green** — Fix failures, re-run tests
6. **If Stuck → Human Checkpoint** — Only when tests cannot pass

## Rules

- Tests MUST exist before implementation
- Gemini reviews tests, finds blind spots
- After Gemini review, tests are LOCKED
- Human checkpoint ONLY when stuck (not pre-approval)
- No changing tests after review without human approval

## Gemini as Antagonist

```bash
gemini -p "Review these test cases for blind spots and edge cases: $(cat tests/...)"
```

Gemini challenges assumptions. Claude designs, Gemini hardens.
