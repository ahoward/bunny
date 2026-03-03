Run `bny spike $ARGUMENTS` from the project root and report the result.

Exploratory build, guardrails off. No gemini review, no test-first.
Output is disposable but the brane still learns.

Common usage:
- `bny spike "prototype oauth flow"` — full pipeline, no review
- `bny spike implement` — just implement, fast
- `bny spike --dry-run "topic"` — show what would run

Show the result to the user.
