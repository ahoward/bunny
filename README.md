# Bunny

A dark factory. AI agents build software autonomously — Claude implements, Gemini hardens, humans intervene only when stuck.

## TL;DR

Bunny is a project template where AI does the work. You describe a feature, two AIs collaborate to build it (one codes, one attacks), and the system retries until tests pass or it gives up and asks a human.

```bash
git clone <repo> && cd bunny && ./dev/setup

bny specify "add user authentication"    # create feature branch + spec
bny plan                                  # create implementation plan
bny tasks                                 # generate task list
bny review                                # gemini finds blind spots in the spec
bny --ralph --max-iter 10 implement       # claude implements, retrying until green
```

That's it. The factory runs. You review the PR.

## What This Is

- **Not a framework.** A template you clone and build on.
- **Not a chatbot wrapper.** A development loop with structural guardrails.
- **Not optional tooling.** The AI agents follow a protocol enforced by git hooks, pre/post-flight checks, and blast radius limits.

## How It Works

```
human writes spec → gemini reviews (antagonist) → claude implements (autonomous)
                                                    ↓
                                              tests pass? → done
                                              tests fail? → retry (ralph loop)
                                              stuck?      → human checkpoint
```

Two AIs, one human:

1. **Claude** designs tests and implements code
2. **Gemini** reviews for blind spots, edge cases, security holes
3. **Human** writes specs, reviews PRs, intervenes when stuck

Tests are locked after Gemini review. No changing them without human approval.

## Stack

- **Runtime:** [Bun](https://bun.sh) — fast TypeScript runtime
- **Language:** TypeScript (strict mode)
- **CLI:** `bin/bny` — git-style subcommand dispatcher
- **Process management:** assassin (cleanup) + ralph (retry loops)
- **No frameworks.** No ORMs. No build tools. Pure Unix.

## Quick Start

```bash
git clone <repo>
cd bunny
./dev/setup          # install deps, configure git hooks
export PATH="./bin:$PATH"
./dev/test           # verify everything works
bny status           # see current state
```

## Commands

### Dev (plumbing)

```bash
./dev/setup          # bun install + git hooks
./dev/test           # run tests
./dev/health         # system health check (JSON)
./dev/pre_flight     # validate before starting work
./dev/post_flight    # validate before committing
```

### bny (orchestration)

```bash
bny specify "..."    # create feature branch + spec
bny plan             # create implementation plan
bny tasks            # generate task list
bny review           # gemini antagonist review
bny implement        # claude autonomous implementation
bny status           # show feature state
bny dev test         # wraps ./dev/test
bny dev pre-flight   # wraps ./dev/pre_flight
```

### Ralph (retry loop)

```bash
bny --ralph --max-iter 10 implement    # retry until green or max iterations
bny --ralph --max-iter 5 review        # retry review too
```

## Directory Layout

```
bin/bny           entry point — git-style dispatcher
bny/              operational state + tooling
  lib/            assassin, ralph, feature, prompt
  specify         create feature workspace
  plan            create implementation plan
  tasks           generate task list
  implement       claude autonomous implementation
  review          gemini antagonist review
  status          show feature state
  dev/            wrappers for ./dev/* scripts
  roadmap.md      what to work on next
  guardrails.json agent constraints (blast radius, protected files)
  decisions.md    append-only decision log
dev/              per-project customizable plumbing (shebangs, chmod +x)
src/              application source
  handlers/       app.call handlers (one file per endpoint)
  lib/            types, result helpers, logging
tests/            tests + fixtures
specs/            feature specs (one dir per feature)
dna/              project knowledge — context only, no operational deps
.githooks/        pre-commit (post_flight), pre-push (test)
```

## Coding Conventions

| Rule | Convention |
|------|-----------|
| Data | POD only — no classes, interfaces and type aliases |
| Naming | `snake_case` vars/functions, `PascalCase` types, `SCREAMING_SNAKE` constants |
| Absence | `null` over `undefined` |
| Errors | Guard early, return errors at function top |
| Simplicity | Three similar lines > one premature abstraction |
| I/O | stdin/stdout/stderr, exit codes, JSON lines |
| Terminology | `params` for input, `result` for output |

## More

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — full development process
- [bny/agent-protocol.md](bny/agent-protocol.md) — the protocol AI agents must follow
- [bny/guardrails.json](bny/guardrails.json) — machine-readable constraints
- [bny/roadmap.md](bny/roadmap.md) — what's next
