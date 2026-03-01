# Dual-AI Development Loop

## Core Pattern

Two AIs with distinct roles, one human as gatekeeper:

1. **Claude** — implements code and designs tests (autonomous)
2. **Gemini** — reviews for blind spots, edge cases, security (antagonist)
3. **Human** — writes specs, reviews PRs, intervenes when stuck

## Flow

```
human writes spec → gemini reviews → claude implements
                                        ↓
                                  tests pass? → done
                                  tests fail? → retry (ralph loop)
                                  stuck?      → human checkpoint
```

## Key Constraint

Tests are locked after gemini review. Changing them requires human approval. This prevents the implementor from weakening its own acceptance criteria.

## Ralph Retry Loop

Autonomous retry mechanism with configurable max iterations:

```bash
bny --ralph --max-iter 10 implement
```

Retries until tests pass or max iterations reached, then escalates to human.

## Tensions

- Autonomy vs. control: agents operate freely within guardrails but cannot modify protected files or exceed blast radius
- Speed vs. safety: the retry loop is fast but bounded to prevent runaway execution
- Trust boundary: claude is trusted to implement but not to judge its own quality — that's gemini's role
