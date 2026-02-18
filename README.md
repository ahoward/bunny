# bny

<p align="center">
  <img src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHFpazAyYzYzbXZsbGo1ajh0eGM1em5icjh3aDhhaGtya2E3b3VkbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ohzdTDCUyuKnFQQrm/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

a dark factory. ai agents build software autonomously — claude implements, gemini hardens, humans intervene only when stuck.

## tl;dr

bny is a project template where ai does the work. you describe a feature, two ais collaborate to build it (one codes, one attacks), and the system retries until tests pass or it gives up and asks a human.

```bash
git clone <repo> && cd bunny && ./dev/setup

bny specify "add user authentication"    # create feature branch + spec
bny plan                                  # create implementation plan
bny tasks                                 # generate task list
bny review                                # gemini finds blind spots in the spec
bny --ralph --max-iter 10 implement       # claude implements, retrying until green
```

that's it. the factory runs. you review the pr.

## what this is

- **not a framework.** a template you clone and build on.
- **not a chatbot wrapper.** a development loop with structural guardrails.
- **not optional tooling.** the ai agents follow a protocol enforced by git hooks, pre/post-flight checks, and blast radius limits.

## how it works

```
human writes spec → gemini reviews (antagonist) → claude implements (autonomous)
                                                    ↓
                                              tests pass? → done
                                              tests fail? → retry (ralph loop)
                                              stuck?      → human checkpoint
```

two ais, one human:

1. **claude** designs tests and implements code
2. **gemini** reviews for blind spots, edge cases, security holes
3. **human** writes specs, reviews prs, intervenes when stuck

tests are locked after gemini review. no changing them without human approval.

## stack

- **runtime:** [bun](https://bun.sh) — fast typescript runtime
- **language:** typescript (strict mode)
- **cli:** `bin/bny` — git-style subcommand dispatcher
- **process management:** assassin (cleanup) + ralph (retry loops)
- **no frameworks.** no orms. no build tools. pure unix.

## quick start

```bash
git clone <repo>
cd bunny
./dev/setup          # install deps, configure git hooks
export PATH="./bin:$PATH"
./dev/test           # verify everything works
bny status           # see current state
```

## commands

### dev (plumbing)

```bash
./dev/setup          # bun install + git hooks
./dev/test           # run tests
./dev/health         # system health check (json)
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

### ralph (retry loop)

```bash
bny --ralph --max-iter 10 implement    # retry until green or max iterations
bny --ralph --max-iter 5 review        # retry review too
```

## directory layout

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

## coding conventions

| rule | convention |
|------|-----------|
| data | pod only — no classes, interfaces and type aliases |
| naming | `snake_case` vars/functions, `PascalCase` types, `SCREAMING_SNAKE` constants |
| absence | `null` over `undefined` |
| errors | guard early, return errors at function top |
| simplicity | three similar lines > one premature abstraction |
| i/o | stdin/stdout/stderr, exit codes, json lines |
| terminology | `params` for input, `result` for output |

## more

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — full development process
- [bny/agent-protocol.md](bny/agent-protocol.md) — the protocol ai agents must follow
- [bny/guardrails.json](bny/guardrails.json) — machine-readable constraints
- [bny/roadmap.md](bny/roadmap.md) — what's next
