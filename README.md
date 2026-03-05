# bunny

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDZ2N2ZscWE1YTduemtlaHFuZ2RkbXc4cmVkZ3dtNTRkZ2x2d3VhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vIemlpNzy5CSOli/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

**an autonomous coding pipeline where two AI agents fight each other to produce tested code.**

self-testing is self-serving. when one AI writes both code and tests, you get green test suites for broken code. bny fixes this with adversarial separation:

- **gemini** writes tests to *break* things — reads the spec, finds gaps, generates a hostile test suite.
- **claude** writes code to *survive* — never sees the test-generation prompt, can't weaken the tests.

code only ships when claude beats gemini's tests. every build feeds a persistent knowledge graph that gets smarter over time.

```
specify → challenge → plan → tasks → test-gen → review → implement → verify → ruminate
claude    gemini      claude  claude   gemini     gemini   claude      gemini   claude
```

## proof

each of these was built from a single sentence. zero human intervention:

| prompt | files | result |
|--------|-------|--------|
| "a REST API that serves fizzbuzz over HTTP" | 3 | clean |
| "a CLI tool that counts words, lines, and characters in files" | 3 | clean |
| "a CLI that lints markdown files for common issues" | 6 | clean |

see [demos/](demos/) for full pipeline output — specs, tests, source, brane state, and logs.

## quick start

requires `ANTHROPIC_API_KEY`. add `GEMINI_API_KEY` for adversarial testing (without it, claude flies solo).

```bash
# install into any git repo
cd my-project
curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash
export PATH="./bin:$PATH"

# scaffold agent state (guest mode — won't clobber your files)
bny init

# give it a task
bny build "add an authentication middleware"
```

or from source:

```bash
git clone https://github.com/ahoward/bunny.git && cd bunny
./dev/setup && export PATH="./bin:$PATH"
```

`bny init` detects your environment and generates the right dev scripts. installs as a guest — `bny uninit --force` removes all traces.

## the core loop

```bash
# 1. feed the knowledge graph
bny digest README.md docs/ https://example.com/api-docs

# 2. let it think
bny brane storm "what about real-time collaboration?"
bny brane loop "auth strategies"                     # autonomous: search → fetch → digest → repeat

# 3. bridge knowledge to execution
bny proposal "auth system"
bny proposal accept auth-system                      # → roadmap item

# 4. build (2 agents, 9 steps, tested code)
bny build "add user auth"

# 5. or prototype without guardrails
bny spike "prototype oauth flow"

# 6. check what the graph learned
bny brane ask "what are the security risks?"
```

run `bny --help` for the full command reference.

## antagonistic testing

**we don't do TDD.** here's why.

TDD assumes the test-writer wants to find bugs. true for disciplined humans; catastrophically false for AI. when an agent writes both, it writes tests to *confirm its own implementation* — optimizing for green checks, not caught failures.

the fix: two agents with opposed incentives.

| step | agent | what |
|------|-------|------|
| **specify** | claude | write spec with acceptance scenarios |
| **challenge** | gemini | harden spec — find gaps, edge cases, ambiguities |
| plan | claude | implementation plan |
| tasks | claude | implementation tasks (no test tasks) |
| **test-gen** | gemini | generate 4-layer test suite from hardened spec |
| review | gemini | antagonist code review |
| **implement** | claude | make gemini's tests pass |
| **verify** | gemini | post-implementation — are the tests real? anything missed? |
| ruminate | claude | reflect on build, feed knowledge graph |

gemini touches the code at 4 points. claude never writes tests. this is not a rule — it's architecture. the system makes the wrong thing hard.

### test layers

1. **contract tests** — one test per acceptance scenario. the spec as code.
2. **property tests** — invariants for all inputs (fast-check, hypothesis, proptest).
3. **golden file tests** — known-good output as fixtures. diff on regression.
4. **boundary tests** — edge cases from the challenge step. empty, max, malformed, unicode.

### graceful degradation

all gemini steps are non-fatal. no gemini? the factory still runs — claude does everything, with a warning. adversarial testing is the best path, but the factory never stops.

### language agnostic

| project | test framework | property lib |
|---------|---------------|-------------|
| bun | `bun:test` | `fast-check` |
| node | `jest` | `fast-check` |
| rust | `cargo test` | `proptest` |
| go | `testing` | `rapid` |
| python | `pytest` | `hypothesis` |
| ruby | `rspec` | `rantly` |

## three pillars

### knowledge graph (brane)

a persistent, self-organizing collection of markdown files. provenance-tracked sources, filterable lenses, full-text search. knowledge compounds — even throwaway spikes teach the graph something.

```bash
bny digest <file|dir|url>                            # ingest
bny brane ask "what are the security risks?"         # query
bny brane storm "real-time collab?"                  # brainstorm
bny brane loop "distributed systems"                 # autonomous research
bny brane enhance "security model"                   # refine
bny brane lens add security "attack vectors, auth"   # perspectives
bny brane rebuild                                    # reprocess everything
bny brane tldr                                       # instant outline
```

### code graph (map)

structural codebase awareness via tree-sitter. functions, classes, imports, exports — parsed, not guessed.

```bash
bny map                                              # generate structural codebase map
```

### dark factory (build)

the 9-step pipeline, or one step at a time:

```bash
bny build "add user auth"                            # full pipeline
bny build specify "add user auth"                    # just one step
bny build challenge                                  # just one step
bny next                                             # pick next roadmap item, run pipeline
bny --effort full build                              # 10 retries, $5 budget
```

## guest mode

bny is a guest, not a landlord. `bny init` uses marker-delimited blocks to safely append to CLAUDE.md, GEMINI.md, AGENTS.md without clobbering your content. idempotent on re-run. `bny uninit --force` removes all traces.

## environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | required | claude (specify, plan, tasks, implement, ruminate) |
| `GEMINI_API_KEY` | optional | gemini (challenge, test-gen, review, verify) |
| `BNY_MODEL` | — | override LLM model for all subcommands |
| `BUNNY_LOG` | off | structured JSON logging to stderr |

## stack

- **runtime:** [bun](https://bun.sh) — fast typescript runtime
- **language:** typescript (strict mode)
- **code awareness:** [tree-sitter](https://tree-sitter.github.io/) via WASM
- **no frameworks.** no orms. no build tools. pure unix.

## dive deeper

- [AGENTS.md](AGENTS.md) — the strict protocol agents must follow
- [demos/](demos/) — complete projects generated from a single sentence
