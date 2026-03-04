# bny

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDZ2N2ZscWE1YTduemtlaHFuZ2RkbXc4cmVkZ3dtNTRkZ2x2d3VhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vIemlpNzy5CSOli/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

## a dark factory

"dark factory" as in lights-out manufacturing — no humans on the floor. agents run autonomously, humans review output.

bny combines three things:

1. **knowledge graph (brane)** — a persistent, self-organizing collection of markdown files that accumulates understanding across every interaction. provenance-tracked sources, filterable lenses, full-text search. knowledge compounds — even throwaway spikes teach the graph something.

2. **code graph (map)** — structural awareness of your codebase via tree-sitter. functions, classes, imports, exports — parsed, not guessed. agents see the shape of the code, not just the text.

3. **dark factory (build)** — a multi-agent pipeline that turns knowledge into working code. claude designs tests and implements. gemini reviews for blind spots and security holes. the pipeline runs end-to-end: specify → plan → tasks → review → implement → ruminate. output feeds back into the knowledge graph.

```
digest → think → propose → build → ruminate
  ↑                                      |
  └──────────────────────────────────────┘
```

code is a side effect of the graph getting smarter.

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

`bny init` detects your project type (bun, node, rust, go, python, make) and generates appropriate dev scripts. it drops in as a guest — marker-delimited blocks in existing files, never clobbers. `bny uninit --force` removes all traces cleanly.

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
bny build                                           # full pipeline: specify → plan → review → implement → ruminate
bny --effort full build                             # 10 retries, $5 budget
bny spin                                            # run detached in tmux

# --- 5. spike — build without guardrails ---
bny spike "prototype oauth flow"                    # no review, exploratory

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

the build pipeline runs all steps by default, or one step at a time.

```bash
bny build                                           # full pipeline
bny build "add user auth"                           # full pipeline with description
bny build specify "add user auth"                   # create spec
bny build plan                                      # create implementation plan
bny build tasks                                     # generate task list
bny build review                                    # gemini antagonist review
bny build implement                                 # claude builds it
bny build ruminate                                  # reflect, feed graph
```

### spike (exploratory)

same interface as build, guardrails off. no gemini review.
output is disposable — but the graph still learns from it.

```bash
bny spike "prototype websocket layer"               # full pipeline, no review
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
bny spin                                            # autonomous — run detached in tmux
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
  lib/            assassin, ralph, feature, prompt, brane, map, spinner, log, result, types
  brane/          eat, ask, lens, rebuild, storm, enhance, tldr, loop
  dev/            wrappers for ./dev/* scripts
  templates/      spec, plan, tasks templates
  init.ts         scaffold a project (guest mode)
  build.ts        the dark factory (full pipeline or per-step)
  ...             specify, plan, tasks, implement, review, ruminate, etc.
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
