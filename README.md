# bny

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDZ2N2ZscWE1YTduemtlaHFuZ2RkbXc4cmVkZ3dtNTRkZ2x2d3VhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vIemlpNzy5CSOli/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

## a dark factory

"dark factory" as in lights-out manufacturing — no humans on the floor. agents run autonomously, humans review output.

### what it does

- **digest** — ingest files, directories, URLs into a persistent knowledge graph
- **storm** — divergent brainstorming against the graph
- **enhance** — convergent refinement of specific topics
- **loop** — autonomous research: web search → fetch → digest → repeat
- **lens** — filterable perspectives (security, performance, architecture)
- **propose** — bridge knowledge to execution: graph generates roadmap items
- **build** — 9-step dark factory: two agents, opposed incentives, tested code out
- **spike** — same pipeline, guardrails off, all failures non-fatal
- **map** — structural codebase awareness via tree-sitter (functions, classes, imports)

### how it works

```
digest → think → propose → build → ruminate
  ↑                                      |
  └──────────────────────────────────────┘
```

bny combines three things:

1. **knowledge graph (brane)** — a persistent, self-organizing collection of markdown files that accumulates understanding across every interaction. provenance-tracked sources, filterable lenses, full-text search. knowledge compounds — even throwaway spikes teach the graph something.

2. **code graph (map)** — structural awareness of your codebase via tree-sitter. functions, classes, imports, exports — parsed, not guessed. agents see the shape of the code, not just the text.

3. **dark factory (build)** — a multi-agent pipeline that turns knowledge into working, *tested* code. claude designs and implements. gemini challenges, writes tests, and verifies. two agents, opposed incentives, no self-serving tests. the pipeline runs end-to-end:

```
specify → challenge → plan → tasks → test-gen → review → implement → verify → ruminate
claude    gemini      claude  claude   gemini     gemini   claude      gemini   claude
```

code is a side effect of the graph getting smarter.

## antagonistic testing

**we don't do TDD.** here's why.

TDD assumes the test-writer wants to find bugs. that's true for a disciplined human developer. it's catastrophically false for AI agents. when the same agent writes tests and code, it writes tests that *confirm its own implementation* — tests optimized to pass, not tests optimized to catch failures. self-testing is self-serving. we watched claude write green test suites for code that was quietly broken. every time.

the fix is adversarial separation. two agents with opposed incentives:

- **gemini** writes tests to *break* things. it reads the spec, finds gaps, generates edge cases, and produces a test suite that the implementation must survive.
- **claude** writes code to *pass* gemini's tests. it never sees the test-generation prompt. it can't weaken the tests. it can only make them green.

neither agent can game the other's output. the tests are locked once written — the implementer is forbidden from modifying them.

### the pipeline

| step | agent | what |
|------|-------|------|
| **specify** | claude | write spec with acceptance scenarios |
| **challenge** | gemini | harden spec — find gaps, edge cases, ambiguities |
| plan | claude | implementation plan |
| tasks | claude | implementation tasks only (no test tasks) |
| **test-gen** | gemini | generate 4-layer test suite from hardened spec |
| review | gemini | antagonist code review |
| **implement** | claude | make gemini's tests pass |
| **verify** | gemini | post-implementation — are the tests real? anything missed? |
| ruminate | claude | reflect on build, feed knowledge graph |

gemini touches the code at 4 points: challenge, test-gen, review, verify. claude never writes tests. this is not a rule — it's architecture. the system makes the wrong thing hard.

### 4-layer test strategy

gemini generates four kinds of tests from the spec:

1. **contract tests** — one test per acceptance scenario. Given/When/Then from the spec becomes a test case. these are the specification as code. if a contract test fails, the feature is broken.

2. **property tests** — invariants that hold for all inputs. roundtrip (parse then format equals identity), idempotency, monotonicity. uses the project's property testing library (fast-check, hypothesis, proptest, rapid).

3. **golden file tests** — capture known-good output for key operations. store expected output as fixtures. diff on regression. catches the bugs that unit tests miss — the ones where the output is *almost* right.

4. **boundary tests** — from edge cases surfaced in the challenge step. empty input, max size, malformed data, unicode, null fields, off-by-one. the adversary finds these during challenge; test-gen turns them into executable tests.

### why this beats TDD

TDD is designed for a single developer iterating in a tight loop. it works well there. but in multi-agent systems:

- **TDD has aligned incentives** — the same mind writes tests and code. it's easy to unconsciously write tests that match the implementation you're already planning.
- **adversarial testing has opposed incentives** — the test-writer has zero knowledge of the implementation strategy. the implementer has zero ability to modify the tests. this is a stronger guarantee than discipline.
- **TDD catches regressions. adversarial testing catches design flaws.** the challenge step finds problems *before* any code exists. the verify step finds problems *after* code passes all tests. TDD can't do either.
- **token savings** — gemini is cheaper than claude. offloading all test generation to gemini cuts the primary agent's token usage significantly.

### graceful degradation

all gemini steps are non-fatal. no gemini API key? no gemini CLI? the factory still runs — it just skips challenge, test-gen, review, and verify. you get the old pipeline (claude does everything) with a warning. adversarial testing is the best path, but the factory never stops.

### language portable

project type detection (`detect_project_type()`) identifies your stack and tells gemini which test framework and patterns to use:

| project | test framework | property lib | test dir |
|---------|---------------|-------------|----------|
| bun | `bun:test` | `fast-check` | `tests/` |
| node | `jest` | `fast-check` | `tests/` |
| rust | `cargo test` | `proptest` | `tests/` |
| go | `testing` | `rapid` | `*_test.go` |
| python | `pytest` | `hypothesis` | `tests/` |
| ruby | `rspec` | `rantly` | `spec/` |

## quick start

```bash
# install into any git repo
cd my-project
curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash
export PATH="./bin:$PATH"

# or from source
git clone https://github.com/ahoward/bunny.git && cd bunny
./dev/setup && export PATH="./bin:$PATH"
```

`bny init` detects your project type (bun, node, rust, go, python, ruby, make) and generates appropriate dev scripts. it drops in as a guest — marker-delimited blocks in existing files, never clobbers. `bny uninit --force` removes all traces cleanly.

## the happy path

```bash
# --- 1. seed — feed the knowledge graph ---
bny digest README.md                                # ingest a file
bny digest https://example.com/api-docs             # ingest a URL
bny digest docs/                                    # ingest a directory
bny brane lens add security "attack vectors, auth gaps, input validation"
bny brane lens add perf "latency, memory, algorithmic complexity"

# --- 2. think — let the graph explore autonomously ---
bny brane storm "what about real-time collaboration?"
bny brane loop "distributed consensus patterns"     # web search, fetch, digest, repeat
bny brane loop --rounds 5 --yes "auth strategies"   # 5 rounds, auto-incorporate
bny brane enhance "security model"                  # sharpen what you've learned

# --- 3. propose — bridge knowledge to execution ---
bny proposal "auth system"                          # graph generates a proposal
bny proposal accept auth-system                     # accepted → roadmap item

# --- 4. build — the dark factory ---
bny build "add user auth"                           # full pipeline (9 steps, 2 agents)
bny build --detached "add user auth"                # same thing, in tmux
bny --effort full build                             # 10 retries, $5 budget

# --- 5. spike — build without guardrails ---
bny spike "prototype oauth flow"                    # same pipeline, all failures non-fatal

# --- 6. check the graph ---
bny brane tldr                                      # see what the graph knows now
bny brane ask "what are the security risks?"        # query the graph
```

## demos

each demo was built from a single sentence — zero human intervention:

```bash
./demos/run-experiment fizzbuzz-api "a REST API that serves fizzbuzz over HTTP"
./demos/run-experiment word-counter "a CLI tool that counts words, lines, and characters in files"
./demos/run-experiment markdown-linter "a CLI that lints markdown files for common issues"
```

| demo | seed | source files | errors |
|------|------|-------------|--------|
| fizzbuzz-api | "a REST API that serves fizzbuzz over HTTP" | 3 | 0 |
| word-counter | "a CLI tool that counts words, lines, and characters in files" | 3 | 0 |
| markdown-linter | "a CLI that lints markdown files for common issues" | 6 | 0 |

see [demos/](demos/) for full output — specs, brane state, source, tests, and pipeline logs.

## commands

### knowledge graph (brane)

the graph is a collection of markdown files that self-organize as you feed it information. sources are stashed with provenance. lenses filter what gets absorbed.

```bash
# digest — ingest into the graph
bny digest <source>                                 # file, directory, or URL
bny digest file://README.md                         # URI scheme supported
bny digest --dry-run docs/                          # show prompt, don't run

# query — read-only
bny brane ask "what are the security risks?"        # question from graph
bny brane ask competitor-spec.md                    # review against graph
bny brane tldr                                      # instant outline (zero LLM)

# think — expand and refine
bny brane storm "real-time collab?"                 # divergent brainstorming
bny brane enhance "security model"                  # convergent refinement
bny brane loop "distributed systems"                # autonomous research loop
bny brane loop --rounds 5 --yes "auth patterns"     # multi-round, auto-incorporate

# lenses — filter perspectives
bny brane lens                                      # list active lenses
bny brane lens add security "attack vectors, auth"  # add a lens
bny brane lens on|off <name>                        # toggle a lens

# rebuild — reprocess all sources through current lenses
bny brane rebuild                                   # rebuild worldview from scratch
```

### code graph (map)

structural codebase awareness via tree-sitter WASM. parses your code into functions, classes, imports, exports — agents use this to understand the shape of the codebase.

```bash
bny map                                             # generate structural codebase map
```

### dark factory (build)

the build pipeline runs all 9 steps by default, or one step at a time.

```bash
bny build                                           # full pipeline (resume current feature)
bny build "add user auth"                           # full pipeline with description
bny build specify "add user auth"                   # create spec (claude)
bny build challenge                                 # harden spec (gemini)
bny build plan                                      # create implementation plan (claude)
bny build tasks                                     # generate task list (claude)
bny build test-gen                                  # generate test suite (gemini)
bny build review                                    # antagonist review (gemini)
bny build implement                                 # make tests pass (claude)
bny build verify                                    # post-implementation review (gemini)
bny build ruminate                                  # reflect, feed graph (claude)
```

### spike (exploratory)

same pipeline as build, guardrails off. all failures non-fatal — the factory keeps going.
output is disposable — but the graph still learns from it.

```bash
bny spike "prototype websocket layer"               # full pipeline, no stops
bny spike implement                                 # just implement, fast
```

### proposal (bridge)

bridge between knowledge (graph) and execution (roadmap).

```bash
bny proposal "auth system"                          # generate proposal
bny proposal --count 3 "backend"                    # generate multiple
bny proposal accept auth-system                     # accept → roadmap item
```

### orchestration

```bash
bny next                                            # pick roadmap item, run full pipeline
bny build --detached "add auth"                     # run in tmux, return immediately
bny build --detached --attach "add auth"            # run in tmux, attach to watch
bny --effort full build                             # 10 iters, $5 budget, 10min timeout
```

### project

```bash
bny init                                            # scaffold project (guest mode)
bny init --minimal                                  # just bny/ state, no dev scripts
bny uninit --force                                  # cleanly remove all bny traces
bny todo                                            # list project todos
bny close-issue 42                                  # close github issue
bny ipm                                             # iteration planning meeting
bny status                                          # show feature state
bny ps                                              # show running bny processes
```

### dev (plumbing)

```bash
./dev/setup                                         # install deps, configure git hooks
./dev/test                                          # run tests
./dev/health                                        # system health check
./dev/pre_flight                                    # validate before starting work
./dev/post_flight                                   # validate before committing
```

## guest mode

bny drops into your project as a guest, not a landlord.

`bny init` uses **marker-delimited blocks** — it appends to existing files instead of replacing them:

```markdown
<!-- bny:start -->
## bny
...bny usage instructions...
<!-- bny:end -->
```

- **agent files patched, not replaced:** CLAUDE.md, GEMINI.md, AGENTS.md get a small bny block appended. your existing content is untouched.
- **multi-agent support:** if `.cursor/rules/`, `.windsurf/rules/`, `.github/agents/`, or other agent directories exist, bny patches those too.
- **idempotent:** run `bny init` again and unchanged files are skipped.
- **fully reversible:** `bny uninit --force` strips all marker blocks and removes `bny/` state.

## directory layout

```
bin/bny           compiled binary — single entry point
src/              CLI source code (the dark factory)
  lib/            assassin, ralph, feature, prompt, brane, map, project, spinner, log, result
  brane/          eat, ask, lens, rebuild, storm, enhance, tldr, loop
  dev/            wrappers for ./dev/* scripts
  templates/      spec, plan, tasks templates
  init.ts         scaffold a project (guest mode)
  build.ts        the dark factory (full pipeline or per-step)
  specify.ts      create feature spec (claude)
  challenge.ts    harden spec — adversary finds gaps (gemini)
  plan.ts         create implementation plan (claude)
  tasks.ts        generate implementation task list (claude)
  test-gen.ts     generate 4-layer test suite from spec (gemini)
  review.ts       antagonist code review (gemini)
  implement.ts    make tests pass (claude)
  verify.ts       post-implementation adversary review (gemini)
  ruminate.ts     reflect on build, feed brane (claude)
  spike.ts        exploratory build (guardrails off)
  next.ts         full pipeline for next roadmap item
bny/              project state (tracked: decisions, guardrails; runtime: brane, proposals)
dev/              per-project dev scripts (auto-generated by init)
tests/            tests + fixtures
```

## environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `BUNNY_LOG` | off | set to `1` for structured JSON logging to stderr |
| `BNY_MODEL` | — | override LLM model for all subcommands |
| `BNY_SECRETS_SCAN` | on | set to `off` to disable secret scanning in tests |

## stack

- **runtime:** [bun](https://bun.sh) — fast typescript runtime
- **language:** typescript (strict mode)
- **code awareness:** [tree-sitter](https://tree-sitter.github.io/) via WASM — structural codebase maps
- **no frameworks.** no orms. no build tools. pure unix.

## more

- [AGENTS.md](AGENTS.md) — the protocol ai agents must follow
- [demos/](demos/) — projects built from a single sentence
