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

## Proof: Iteration 001 — Brane Gate

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
3. Source provenance in ask responses (traceability) — **deferred → built in iteration 002**
4. Digest preview (low frequency, nice to have) — **deferred**

## Proof: Iteration 002 — Source Provenance

The second cycle validated that the loop sustains itself and scales down gracefully:

1. After iteration 001, asked the brane what to build next
2. Brane identified source provenance — the output side of the trust boundary (iteration 001 gated input; 002 sources output)
3. Built provenance via **prompt engineering alone** — no code changes to `brane.ts`
4. Leveraged `list_sources()` that already existed from iteration 001's stashing work
5. Iteration log eaten back into the brane

### Key Insight

Not every iteration demands a big feature. The highest-value change was making existing output more trustworthy — a prompt change, not a system change. Good decisions compound: the stashing work from iteration 001 provided the infrastructure iteration 002 needed. The loop rewards building well over building big.

## Why It's Safe

The loop is powerful because it's constrained:

- **Blast radius limits** bound each iteration
- **Gemini reviews** every change (antagonist)
- **Human reviews** every PR (gatekeeper)
- **Tests lock** after review (immutable acceptance criteria)
- **Brane remembers** why decisions were made (audit trail)
- **Digest reprocesses** when lenses change (worldview stays current)
- **Brane gate** shows intake diff before committing worldview changes (poisoning defense)
- **Source provenance** traces answers back to their origins (output auditability)

## Relationship to Other Concepts

- The [Dual-AI Loop](dual-ai-loop.md) is the execution engine within each iteration
- The [Guardrails System](guardrails-system.md) constrains what each iteration can do
- The brane is the accumulator — it grows richer with each cycle
