# Development

How this repo works, end to end.

## Stack

- **Runtime:** [Bun](https://bun.sh)
- **Language:** TypeScript (strict mode, ESNext)
- **Binary:** `bun build --compile` produces a standalone executable

## Getting Started

```bash
git clone <repo>
./dev/setup
```

That's it. Installs dependencies and configures git hooks.

## Scripts

Everything is in `./dev/`. No `npm run`, no `bun run`, no indirection.

```bash
./dev/setup        # install deps, configure git hooks
./dev/test         # run tests
./dev/health       # check system health (JSON to stdout)
./dev/pre_flight   # validate before starting work
./dev/post_flight  # validate before committing
```

All scripts are executable with shebangs. Bash or Bun, depending on the task. Exit 0 = good, exit 1 = bad.

## bny — The Dark Factory CLI

`bin/bny` is the unified entry point for all development orchestration.

```bash
bny specify        # create feature branch + spec
bny plan           # create implementation plan
bny tasks          # generate task list
bny implement      # drive AI implementation loop
bny review         # antagonist review
bny status         # show current state
bny dev/test       # wraps ./dev/test
bny dev/pre-flight # wraps ./dev/pre_flight
```

Ralph loop (retry wrapper):
```bash
bny --ralph --max-iter 10 implement 001-auth
```

## Git Hooks

Configured automatically by `./dev/setup`. Lives in `.githooks/`.

| Hook | Runs | Effect |
|------|------|--------|
| `pre-commit` | `./dev/post_flight` | Blocks commit if types fail, tests fail, untracked sources exist, secrets in diff, or blast radius exceeded |
| `pre-push` | `./dev/test` | Blocks push if tests fail |

No husky, no lefthook, no npm lifecycle scripts. Just `git config core.hooksPath .githooks`.

## Directory Layout

```
src/              # Source code
  handlers/       # app.call handlers (one file per endpoint)
  lib/            # shared types, result helpers, logging
tests/            # Tests
  fixtures/       # deterministic test inputs (POD)
specs/            # Feature specs
bin/              # Executables
  bny             # dark factory CLI entry point
bny/              # Dark factory CLI — operational state + tooling
  lib/            # shared modules (assassin, ralph)
  roadmap.md      # what to work on next
  guardrails.json # agent constraints
  decisions.md    # append-only decision log
dna/              # Project knowledge — context only
  technical/      # development loop, conventions
  research/       # papers, analysis
dev/              # Dev tooling (shebang, chmod +x, per-project customizable)
.githooks/        # Git hooks (pre-commit, pre-push)
docs/             # You are here
```

## Coding Conventions

| Convention | Rule |
|---|---|
| Data | POD only — no classes for data, types are interfaces or type aliases |
| Naming | `snake_case` for variables/functions, `PascalCase` for types, `SCREAMING_SNAKE` for constants |
| Absence | `null` over `undefined` |
| Errors | Guard early — return errors at function top, no exceptions for control flow |
| Simplicity | Three similar lines > one premature abstraction |
| I/O | stdin/stdout/stderr, exit codes matter, JSON lines |
| Terminology | `params` for input, `result` for output, never "data" |

## Development Loop: Antagonistic Testing

Two AIs, one human.

1. **Design interface** — define the public API
2. **Design tests (Claude)** — Claude writes the first pass of test cases
3. **Review tests (Gemini)** — Gemini acts as antagonist, finds blind spots, suggests harder cases
4. **Tests lock** — after Gemini review, tests are frozen
5. **Implement** — write code to make the tests pass
6. **Loop until green** — fix failures, re-run
7. **If stuck** — human checkpoint (only when tests cannot pass)

Tests are locked after review. No changing them without human approval.

## Workflow: Picking Up Work

All work is driven by `bny/roadmap.md`.

```
./dev/pre_flight       confirm environment is ready
roadmap                   find the next item
  -> bny specify          create specs/{feature}/spec.md
  -> open PR              human reviews the spec
  -> bny plan             create implementation plan
  -> bny tasks            generate task list
  -> bny review           antagonist reviews test cases
  -> bny implement        execute tasks
  -> ./dev/test           after every change
  -> ./dev/post_flight    before every commit (also enforced by git hook)
  -> stuck?               human checkpoint
  -> done                 update bny/roadmap.md, append to bny/decisions.md
```

## Principles

The full set of project principles lives in `dna/technical/development-loop.md`. The short version:

1. **POD only** — plain old data in, plain old data out
2. **Antagonistic testing** — Claude designs, Gemini hardens, then implement
3. **Unix-clean** — null not undefined, exit codes, streams, text protocols
4. **Simplicity (YAGNI)** — no premature abstractions, no "just in case" features
