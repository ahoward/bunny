# Iteration 002: Source Provenance in Ask

**Date:** 2026-03-01
**Cycle:** bny building bny (the strange loop, second pass)

## How We Got Here

After iteration 001 (brane gate), asked the brane what to build next. It identified source provenance in `ask` — the output side of the trust boundary. Iteration 001 gated input; iteration 002 sources output.

## What The Brane Said

> Right now the brane is an oracle — it answers but doesn't show its work. This creates three problems: trust gap, poison detection gap, audit gap.

It proposed ending every `ask` response with a `Sources:` section tracing worldview files back to original ingested sources.

## What We Built

Updated `bny/brane/ask` prompt with:
1. Source provenance section — passes the full source manifest (label + timestamp) to claude
2. Available file list — tells claude exactly which worldview paths exist
3. Structured citation format — every response ends with `Sources:` listing worldview files and their original source origins

No code changes to `bny/lib/brane.ts`. This was pure prompt engineering — the `list_sources()` function already existed from iteration 001's stashing work.

## Decisions

1. Provenance is prompt-enforced, not mechanically parsed. Claude cites sources because the prompt tells it to, not because we extract them programmatically. This is consistent with brane's philosophy — LLM-powered, not database-powered.
2. Included the full source manifest in the ask prompt so claude can trace worldview → original source.
3. Kept output as plain text with structured footer. No JSON wrapper for ask — it's human-facing.

## What I Learned

This iteration was smaller than 001 — a prompt change, not a new system. That feels right. The strange loop shouldn't demand big features every cycle. Sometimes the highest-value change is making what exists more trustworthy. The provenance chain (worldview file → original source) emerged naturally from the stashing work in the previous iteration. Good decisions compound.
