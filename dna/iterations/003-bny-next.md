# Iteration 003: bny next

**Date:** 2026-03-01
**Cycle:** bny building bny (the strange loop, third pass)

## How We Got Here

After iterations 001 (intake gate) and 002 (source provenance), asked the brane what to build next. Prompted it to think beyond security hardening — what would make bny useful for daily work.

## What The Brane Said

> Right now, the workflow is a 12-step manual checklist. The developer is acting as a scheduler for a workflow the system already knows by heart. The clunky part isn't any single step — it's the orchestration between steps. You're the glue.

It proposed `bny next` — a single command that reads the roadmap, picks the next item, and runs the full pipeline with one human gate (spec review).

## What We Built

`bny/next` — orchestrator that runs:

1. Parse roadmap for first unchecked item
2. pre_flight
3. specify (create branch + spec)
4. **human reviews spec** (pause, confirm)
5. plan
6. tasks
7. review (gemini)
8. implement (claude, with ralph)
9. post_flight
10. update roadmap + decisions.md

Supports `--dry-run` (shows plan without executing) and `--max-iter N` (ralph iterations, default 5).

## Decisions

1. One human gate, not three. The spec review is where judgment matters. Everything downstream is mechanical within guardrails.
2. Review failure is non-fatal — gemini might not be available, and the pipeline shouldn't block on it.
3. Implementation failure gets a second confirm — "continue anyway?" — because sometimes partial progress is worth keeping.
4. Roadmap update is automatic — checks off the item and appends to decisions.md.
5. The "continue anyway" confirm after failed implement defaults to No (unlike the spec review which defaults to Yes). Failed implementation is the exceptional case.

## What I Learned

This is where bny stops being a toolkit and starts being a factory. The human's role shifts from scheduler to reviewer. The brane proposed this because it understood the workflow diagram in its own worldview — it could see that every step was manual glue between automated operations. Three iterations in, the pattern holds: the brane identifies the gap, we build the fix, the log gets eaten, the worldview evolves.
