# The Strange Loop

## Core Concept

bny builds bny. The system improves its own tooling through an iterative knowledge cycle:

```
research/feedback/decisions → brane (knowledge base)
                                ↓
                        brane informs what to build
                                ↓
                    specify → plan → implement → review
                                ↓
                        human reviews output
                                ↓
                    feedback eaten back into brane
                                ↓
                        brane reprocesses (digest)
                                ↓
                              repeat
```

## Why It Works

Software that can improve its own tooling converges faster than software built by tools that never learn. The brane is the memory that makes each iteration smarter than the last.

## Why It's Safe

The loop is powerful because it's constrained:

- **Blast radius limits** bound each iteration
- **Gemini reviews** every change (antagonist)
- **Human reviews** every PR (gatekeeper)
- **Tests lock** after review (immutable acceptance criteria)
- **Brane remembers** why decisions were made (audit trail)
- **Digest reprocesses** when lenses change (worldview stays current)

## Relationship to Other Concepts

- The [Dual-AI Loop](dual-ai-loop.md) is the execution engine within each iteration
- The [Guardrails System](guardrails-system.md) constrains what each iteration can do
- The brane is the accumulator — it grows richer with each cycle
