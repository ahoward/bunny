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

## First Proof: Iteration 001

The strange loop's first full cycle validated the pattern:

1. Brane was loaded with codebase knowledge (README, constitution, security analysis)
2. Security POV asked: "what is the single highest-value thing to build next?"
3. Brane identified **itself** as the biggest vulnerability — ungated intake
4. The system built **brane gate** (intake diff + confirmation) to close the gap
5. The iteration log was eaten back into the brane for future cycles

The security POV drove the first iteration toward safety over features — the brane prioritized closing its own open door over building something new. This validated that POV-driven prioritization works: the lens you look through determines what you build.

### Priority Ordering (from iteration 001)

The iteration established a prioritization heuristic — **high value × high frequency first**:

1. Intake diff (high value, high frequency) — **built**
2. `--yes` flag for ergonomics — **built**
3. Source provenance in ask responses (traceability) — **deferred**
4. Digest preview (low frequency, nice to have) — **deferred**

## Why It's Safe

The loop is powerful because it's constrained:

- **Blast radius limits** bound each iteration
- **Gemini reviews** every change (antagonist)
- **Human reviews** every PR (gatekeeper)
- **Tests lock** after review (immutable acceptance criteria)
- **Brane remembers** why decisions were made (audit trail)
- **Digest reprocesses** when lenses change (worldview stays current)
- **Brane gate** shows intake diff before committing worldview changes (poisoning defense)

## Relationship to Other Concepts

- The [Dual-AI Loop](dual-ai-loop.md) is the execution engine within each iteration
- The [Guardrails System](guardrails-system.md) constrains what each iteration can do
- The brane is the accumulator — it grows richer with each cycle
