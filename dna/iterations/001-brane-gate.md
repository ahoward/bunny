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

1. Built intake diff + confirmation as the core gate (items 1 and 2 from priority list)
2. Digest gets a confirmation gate before clearing worldview (destructive op), but individual re-eats within digest auto-apply (confirming each would be tedious)
3. `confirm_intake()` reads from `/dev/tty` directly so it works even when stdin is piped. Auto-confirms when not a TTY.
4. Deferred source provenance in ask responses and digest preview to a future iteration

## Implementation Log

**Added to `bny/lib/brane.ts`:**
- `OpDiff` type — tracks old/new line counts, added/removed for each operation
- `preview_operations(root, ops)` — reads existing files, computes line-level diff stats
- `print_intake_diff(diffs, reasoning)` — prints compact diff summary to stderr
- `confirm_intake()` — reads y/n from `/dev/tty`, auto-confirms if not TTY

**Modified `bny/brane/eat`:**
- Added `--yes` / `-y` flag
- Injected gate between parse and apply: preview → confirm → apply
- Removed duplicate reasoning output (now shown in intake diff)

**Modified `bny/brane/digest`:**
- Added `--yes` / `-y` flag
- Added confirmation before clearing worldview: shows source count + total size

**Output format:**
```
[intake]
  + architecture/strange-loop.md          (42 lines)
  ~ security/autonomous-agent-risks.md    (+8, -2)

reasoning: absorbed strange loop concept...

3 operations (1 new, 2 updated)

apply? [Y/n]
```

## What I Learned

The strange loop works. The brane identified its own vulnerability, proposed the fix, and we built it. The security POV earned its keep — without it, we might have built something shiny instead of something safe. The iteration log itself is a form of source that future iterations can eat.
