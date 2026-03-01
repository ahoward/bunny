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

## Proof: Iteration 003 — bny next

The third cycle shifted from hardening to ergonomics — the brane looked at the workflow itself:

1. After iteration 002, prompted the brane to think beyond security — what would make bny useful for daily work?
2. Brane identified **orchestration overhead** as the gap: the 12-step manual workflow was fully automatable, with the human acting as scheduler for steps the system already knew
3. Built `bny next` — single command that runs the full pipeline from roadmap to completion
4. One human gate (spec review), everything else mechanical within guardrails
5. Iteration log eaten back into the brane

### Key Insight

The brane diagnosed its own workflow by reading the workflow diagram in its own worldview. It proposed eliminating the human-as-scheduler pattern — the shift from toolkit to factory. Three iterations established the progression: **gate the input** (001) → **source the output** (002) → **automate the middle** (003). Each iteration built on the previous: the gate and provenance systems are what make single-command automation safe enough to trust.

### Design Decisions

- **One gate, not three** — spec review is where human judgment matters; downstream steps are mechanical within guardrails
- **Review failure is non-fatal** — gemini might be unavailable; the pipeline shouldn't block on it
- **Implementation failure gets a second confirm** — "continue anyway?" defaults to No (unlike spec review which defaults to Yes)
- **Automatic roadmap update** — checks off the item and appends to decisions.md

## Proof: Iteration 004 — bny spin

The fourth cycle cut the last thread of synchronous human involvement:

1. Tried to run `bny next` from within a claude session — hit the nested session wall
2. The practical blocker revealed the conceptual next step: the human was still the scheduler, just a faster one
3. Built `bny next --auto` (skip all human checkpoints) and `bny spin` (launch in detached tmux session)
4. The human's role shifted from gatekeeper to critic — review output, write opinions, feed back into brane
5. Iteration log eaten back into the brane

### Key Insight

The progression across four iterations tells a coherent story of removing human glue:

| Iteration | What | Human role removed |
|-----------|------|--------------------|
| 001 | Gate the input | — (added a gate) |
| 002 | Source the output | — (added traceability) |
| 003 | Automate the middle | Human as scheduler |
| 004 | Cut the cord | Human as synchronous gatekeeper |

What remains is pure judgment — reviewing output and writing feedback. The factory runs; the human tastes. Each iteration removed one piece of human glue while preserving (or adding) mechanical safety constraints.

### Design Decisions

- **tmux over nohup/screen** — ubiquitous on dev machines, supports attach/detach, creates a real PTY (which claude CLI needs)
- **Clean env via targeted stripping** — removes `CLAUDECODE`/`CLAUDE_CODE_SESSION` to avoid nested-session detection, preserves everything else
- **Spin logs gitignored** — runtime state, not project knowledge. The iteration log captures what matters
- **Duplicate detection** — `tmux has-session` prevents launching the same item twice

## The Autonomy Gradient

The four iterations trace a clear gradient from manual to autonomous:

```
Manual (12-step checklist)
  → Semi-automated (bny next, one human gate)
    → Fully automated (bny next --auto, no gates)
      → Detached (bny spin, human not present)
```

Each step preserved all mechanical constraints (blast radius, locked tests, post_flight) while removing one layer of human synchronous involvement. The safety model evolved from **pre-approval** to **post-review** — the human reviews output after the fact rather than approving each step before it runs.

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
- **Single-command pipeline** preserves all constraints while removing manual orchestration overhead
- **Detached execution** logs all output for async review; duplicate detection prevents runaway launches

## Relationship to Other Concepts

- The [Dual-AI Loop](dual-ai-loop.md) is the execution engine within each iteration
- The [Guardrails System](guardrails-system.md) constrains what each iteration can do
- The brane is the accumulator — it grows richer with each cycle
- `bny next` is the orchestrator — it turns the loop from a manual checklist into an automated pipeline
- `bny spin` is the detacher — it lets the pipeline run without the human present
