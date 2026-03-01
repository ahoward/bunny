# Iteration 004: bny spin

**Date:** 2026-03-01
**Cycle:** bny building bny (the strange loop, fourth pass)

## How We Got Here

Built `bny next` in iteration 003. Tried to run it from within a claude session — hit the nested session wall. The human asked: "what if we could just spin it up detached?"

## What We Built

Two changes:

**`bny next --auto`** — new flag that skips human checkpoints. The pipeline runs end-to-end without interaction. Same guardrails (blast radius, gemini review, locked tests), no human gate.

**`bny spin`** — launches `bny next --auto` in a detached tmux session with a clean env (strips CLAUDECODE, CLAUDE_CODE_SESSION). Returns immediately.

Features:
- `--attach` — launch and attach to watch live
- `--log` — tail the latest spin log
- `--dry-run` — show what would launch
- Duplicate detection — won't launch if session already running
- Logs to `.bny/spin/{timestamp}-{slug}.log` with `latest.log` symlink
- Clean env — strips nested-session env vars so claude CLI works

## The Workflow It Enables

```
bny spin                          # factory runs autonomously
bny spin --log                    # watch progress
cat .bny/spin/latest.log          # review output
echo "feedback" > feedback.md     # write feedback
bny brane eat feedback.md         # feed back into brane
bny spin                          # next iteration, brane is smarter
```

The human's role: taste and judgment, not scheduling. Review output, write opinions, feed them in. The factory gets better each cycle because the brane accumulates preferences.

## Decisions

1. tmux over nohup/screen — tmux is ubiquitous on dev machines, supports attach/detach natively, creates a real PTY (which claude CLI needs)
2. Clean env by stripping specific vars rather than `env -i` — preserves PATH, HOME, shell config while removing only the nested-session blockers
3. Spin logs gitignored — runtime state, not project knowledge. The iteration log (this file) captures what matters.
4. Duplicate detection — `tmux has-session` check prevents launching the same item twice

## What I Learned

The progression across four iterations tells a story:
- 001: gate the input (make intake safe)
- 002: source the output (make answers traceable)
- 003: automate the middle (stop being the scheduler)
- 004: cut the cord (run without the human present)

Each iteration removed one piece of human glue. What remains is pure judgment — reviewing output and writing feedback. That's what humans are for.
