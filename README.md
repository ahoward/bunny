# bunny

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDZ2N2ZscWE1YTduemtlaHFuZ2RkbXc4cmVkZ3dtNTRkZ2x2d3VhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vIemlpNzy5CSOli/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

**a dark factory for the solo developer.** two AI agents, seven steps, one build at a time — and a knowledge graph that makes every build smarter than the last.

most AI coding tools scale by throwing more agents at the problem. bunny scales by *learning*. every build, every spike, every brainstorm feeds a persistent knowledge graph. the tenth build knows what the first nine learned. parallel agents are fast and dumb. serial + recursive is slow and wise.

the factory runs a single, observable pipeline — you can watch each step, intervene anywhere, re-run one phase. no orchestrator black box. no 50-agent swarm you can't debug. just two agents with adversarial incentives:

- **gemini** writes tests to *break* things — reads the spec, finds gaps, generates a hostile test suite.
- **claude** writes code to *survive* — never sees the test-generation prompt, can't weaken the tests.

code ships when claude beats gemini's tests. then both agents feed the knowledge graph.

```
specify → challenge → plan → tasks → narrow[1→2→3] → verify → ruminate
claude    gemini      claude  claude   gemini+claude    gemini   claude
```

## proof

each of these was built from a single sentence. zero human intervention:

| prompt | tests | result |
|--------|-------|--------|
| "a library that parses semver ranges (^, ~, >=, \|\|, hyphen, x-ranges)" | 54 | clean |
| "RFC 6902 JSON Patch — add, remove, replace, move, copy, test with atomic rollback" | 37 | clean |
| "a cron expression parser that computes the next N scheduled times" | 12 | clean |

see [demos/](demos/) for full pipeline output — specs, tests, source, knowledge graph state, and logs.

## quick start

bunny requires both API keys — the adversarial model needs two agents:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."   # claude: spec, plan, implement, ruminate
export GEMINI_API_KEY="..."             # gemini: challenge, test-gen, verify
```

install into any git repo:

```bash
cd my-project
curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash
```

this drops a single binary at `./bin/bny`. run it directly, or copy/symlink it somewhere on your PATH:

```bash
# scaffold project state (guest mode — won't clobber your files)
./bin/bny init

# give it a task
./bin/bny build "add an authentication middleware"
```

or from source:

```bash
git clone https://github.com/ahoward/bunny.git && cd bunny
./dev/setup
./bin/bny --help
```

### what `bny init` does

`bny init` detects your project type (bun, node, rust, go, python, ruby) and scaffolds:

- `bny/` directory — project state (roadmap, decisions, knowledge graph)
- `dev/` scripts — test, setup, health, pre/post-flight (customizable)
- `AGENTS.md` — protocol file for AI agents working in your repo

it's a guest, not a landlord — uses marker-delimited blocks so it never clobbers your existing files. idempotent on re-run. `bny uninit --force` removes all traces.

### what `bny build` does

`bny build` creates a feature branch and runs the full pipeline. all changes happen on that branch — your main branch is untouched until you merge.

the pipeline streams output to your terminal as it runs. when it finishes, you're on the feature branch with passing tests — review the code, run `./dev/test`, and merge when satisfied.

if the pipeline can't pass all tests after 9 attempts (3 rounds × 3 retries), it stops and reports what failed. the branch is left in place so you can inspect or continue manually.

use `--interactive` to pause at checkpoints (after spec, before each narrowing round) for human review.

typical cost: **$0.50–$2.00 per build** depending on spec complexity and retry count. spikes are cheaper (~$0.25). knowledge graph operations (digest, storm, loop) are ~$0.05–$0.20 each.

## the core loop

```bash
# 1. feed the knowledge graph
bny digest README.md docs/ https://example.com/api-docs

# 2. let it think
bny brane storm "what about real-time collaboration?"
bny brane loop "auth strategies"                     # autonomous: search → fetch → digest → repeat

# 3. bridge knowledge to execution
bny proposal "auth system"
bny proposal accept auth-system                      # → appends to bny/roadmap.md

# 4. build (2 agents, 7 steps, tested code)
bny build "add user auth"

# 5. or prototype without guardrails
bny spike "prototype oauth flow"

# 6. check what the graph learned (it compounds)
bny brane ask "what are the security risks?"
```

run `bny --help` for the full command reference.

## three pillars

### knowledge graph (brane)

a persistent, self-organizing knowledge graph that accumulates understanding across every build, spike, and brainstorm. `brane loop` is autonomous research — it reflects on gaps, searches the web, fetches sources, absorbs what it finds, and repeats until it converges. the tenth build knows what the first nine learned.

stored locally in `bny/brane/` as markdown files. commit it to share context with your team, or gitignore it for personal use.

```bash
bny digest <file|dir|url>                            # ingest
bny brane ask "what are the security risks?"         # query (read-only)
bny brane storm "real-time collab?"                  # divergent brainstorming
bny brane loop "distributed systems"                 # autonomous research
bny brane enhance "security model"                   # convergent refinement
bny brane lens add security "attack vectors, auth"   # filtering perspectives
bny brane rebuild                                    # reprocess everything through current lenses
bny brane tldr                                       # instant outline
```

### code graph (map)

structural codebase awareness via tree-sitter. functions, classes, imports, exports — parsed, not guessed.

```bash
bny map                                              # generate structural codebase map
```

### dark factory (build)

the 7-step pipeline (with 3×3 narrowing), or one step at a time:

```bash
bny build "add user auth"                            # full pipeline
bny build specify "add user auth"                    # just one step
bny build challenge                                  # just one step
bny next                                             # pick next roadmap item, run pipeline
bny --effort full build                              # more retries per round
```

## adversarial TDD

**we don't let the same agent write tests and code.** here's why.

traditional TDD assumes the test-writer wants to find bugs. true for disciplined humans; catastrophically false for AI. when one agent writes both tests and implementation, it writes tests to *confirm its own approach* — optimizing for green checks, not caught failures.

the fix: two agents with opposed incentives.

| step | agent | what |
|------|-------|------|
| specify | claude | write spec with acceptance scenarios |
| **challenge** | **gemini** | harden spec — find gaps, edge cases, ambiguities |
| plan | claude | implementation plan |
| tasks | claude | implementation tasks (no test tasks) |
| **narrow** | **gemini** writes tests, claude implements | 3×3 narrowing (see below) |
| **verify** | **gemini** | post-implementation — are the tests real? anything missed? |
| ruminate | claude | reflect on build, feed knowledge graph |

**bold = gemini involvement.** gemini writes every test. claude writes every line of implementation. claude never sees the test-generation prompt. this is not a rule — it's architecture. the system makes the wrong thing hard.

### 3×3 narrowing

instead of generating all tests at once and hoping claude passes them, we narrow in 3 rounds — each more adversarial than the last:

| round | gemini writes | gemini sees | claude's job |
|-------|--------------|-------------|-------------|
| 1. **contracts** | spec-as-code tests | spec + challenge | build the foundation |
| 2. **properties** | behavioral invariants | spec + claude's source code | don't break contracts |
| 3. **boundaries+golden** | edge cases + regression snapshots | spec + source + all tests | don't break anything |

each round: gemini generates tests (`bny build test-gen --round N`), then claude implements (`bny build implement --round N`) with up to 3 retries. max 9 test runs total. typical: ~4.

the key insight: rounds 2-3 include claude's actual source code. gemini doesn't just test the spec — it targets where claude's implementation is weakest. this is adversarial review with teeth.

### test layers

1. **contract tests** (round 1) — one test per acceptance scenario. the spec as code.
2. **property tests** (round 2) — invariants for all inputs (fast-check, hypothesis, proptest).
3. **golden file tests** (round 3) — known-good output as fixtures. diff on regression.
4. **boundary tests** (round 3) — edge cases from the challenge step. empty, max, malformed, unicode.

### language agnostic

bunny auto-detects your project type from config files (`package.json`, `Cargo.toml`, `go.mod`, etc.) and configures the right test framework and property testing library. zero config.

| project | test framework | property lib |
|---------|---------------|-------------|
| bun | `bun:test` | `fast-check` |
| node | `jest` | `fast-check` |
| rust | `cargo test` | `proptest` |
| go | `testing` | `rapid` |
| python | `pytest` | `hypothesis` |
| ruby | `rspec` | `rantly` |

## environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | required | Claude (specify, plan, tasks, implement, ruminate) |
| `GEMINI_API_KEY` | required | Gemini (challenge, test-gen, verify) |
| `BNY_MODEL` | — | override LLM model for all subcommands |
| `BUNNY_LOG` | off | structured JSON logging to stderr |

## stack

- **runtime:** [bun](https://bun.sh) — fast typescript runtime
- **language:** TypeScript (strict mode)
- **code awareness:** [tree-sitter](https://tree-sitter.github.io/) via WASM
- **no frameworks.** no ORMs. no build tools. zero framework dependencies.

## dive deeper

- [AGENTS.md](AGENTS.md) — the strict protocol agents must follow
- [demos/](demos/) — complete projects generated from a single sentence
