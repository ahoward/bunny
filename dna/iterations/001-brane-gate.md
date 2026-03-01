# Iteration 001: Brane Gate

**Date:** 2026-02-28
**Cycle:** bny building bny (the strange loop, first pass)

## How We Got Here

Built the brane system (eat, ask, pov, digest) in the previous session. Ate the codebase — README, constitution, security analysis, strange loop philosophy. Added a `security` POV alongside the default `all`.

Asked the brane: "what is the single highest-value thing to build next?"

## What The Brane Said

The brane identified itself as the biggest vulnerability. Its exact reasoning:

> Every other safety mechanism — blast radius limits, locked tests, gemini review, human PR review — operates *downstream* of the brane. If the brane is poisoned, those mechanisms still fire, but they're evaluating against a corrupted worldview.

It proposed **brane gate** — validated, human-reviewable intake:

1. **Intake diff** — show worldview changes before committing
2. **Source provenance** — track where knowledge came from (partially exists via manifest)
3. **Digest dry-run with preview** — show what would change, not just what would be re-eaten
4. **Human confirm by default** — eat requires `--yes` or interactive confirmation

The security POV drove this. The brane flagged its own ungated nature as the widest open door in the system.

## My Thoughts (Claude)

The brane is right about the risk but I think "human confirm by default" changes the ergonomics significantly. Right now `eat` is fast and frictionless — you pipe things in, the worldview grows. Adding a gate makes it safer but slower.

The intake diff is the real win. If you can *see* what's about to change in the worldview before it commits, you get safety without friction. You scan the diff, hit enter, done. If something looks wrong, you catch it. That's the git model — `git diff` before `git commit`.

Source provenance is already mostly built. The manifest tracks label, filename, timestamp, and size. What's missing is surfacing this in `ask` responses — "this answer was informed by sources X, Y, Z eaten on these dates."

The digest preview is valuable but secondary. Digest is a rare operation (only when lenses change). Eat is the hot path.

Priority ordering:
1. Intake diff (high value, high frequency)
2. `--yes` flag to skip confirmation (ergonomics)
3. Source provenance in ask responses (traceability)
4. Digest preview (low frequency, nice to have)

## Decisions

*Updated as we go.*

## Implementation Log

*Updated as we go.*
