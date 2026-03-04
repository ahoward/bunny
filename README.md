# bny

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDZ2N2ZscWE1YTduemtlaHFuZ2RkbXc4cmVkZ3dtNTRkZ2x2d3VhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vIemlpNzy5CSOli/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

## a persistent knowledge graph for software projects

most ai coding tools treat each task as isolated. knowledge evaporates between sessions.

bny manages a **persistent knowledge graph** — a self-organizing collection of markdown files that accumulates understanding across every interaction. the graph has provenance-tracked sources, filterable lenses, and full-text search. code is a side effect of the graph getting smarter.

```
digest → think → propose → build → ruminate
  ↑                                      |
  └──────────────────────────────────────┘
```

**digest** information from files, URLs, and directories. the graph grows. **think** autonomously — search the web, fetch sources, refine understanding. **propose** concrete work from accumulated knowledge. **build** it with adversarial review and test-first implementation. **ruminate** on what was built — lessons feed back into the graph.

every cycle compounds. even throwaway spikes teach the graph something.

## the happy path

```bash
# --- 0. setup ---
bny init && export PATH="./bin:$PATH"

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

four actors:

1. **claude** designs tests and implements code
2. **gemini** reviews for blind spots, edge cases, security holes
3. **brane** the knowledge graph — accumulates understanding across iterations
4. **human** seeds ideas, reviews output, course-corrects

## commands

### knowledge graph

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

### build (dark factory)

the build pipeline. runs all steps by default, or one step at a time.

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
bny map                                             # structural codebase map (tree-sitter)
bny --effort full build                             # 10 iters, $5 budget, 10min timeout
```

### project

```bash
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

`bny init` detects your project type (bun, node, rust, go, python, make) and generates appropriate dev scripts.

## directory layout

```
bin/bny           compiled binary — single entry point
.bny/             project state (git-tracked, per-project)
  roadmap.md      what to work on next
  guardrails.json agent constraints (blast radius, protected files)
  decisions.md    append-only decision log
  proposals/      generated proposals (bridge: knowledge → execution)
  loops/          persistent thought loop state
  brane/          knowledge graph
    worldview/    self-organizing markdown knowledge base
    lenses/       perspective lenses (all.md is default)
    sources/      stashed raw inputs with provenance
    state.json    active lenses
bny/              dark factory CLI source (symlinkable)
  lib/            assassin, ralph, feature, prompt, brane, map, spinner
  brane/          eat, ask, lens, rebuild, storm, enhance, tldr, loop
  digest.ts       top-level digest command (URI scheme support)
  build.ts        the dark factory (full pipeline or per-step)
  spike.ts        exploratory builds (guardrails off)
  proposal.ts     graph → roadmap bridge
  ruminate.ts     post-build reflection
dev/              per-project dev scripts (auto-generated by init)
tests/            tests + fixtures
specs/            feature specs (one dir per feature)
```

## stack

- **runtime:** [bun](https://bun.sh) — fast typescript runtime
- **language:** typescript (strict mode)
- **code awareness:** [tree-sitter](https://tree-sitter.github.io/) via WASM — structural codebase maps
- **no frameworks.** no orms. no build tools. pure unix.

## more

- [bny/AGENTS.md](bny/AGENTS.md) — the protocol ai agents must follow
- [.bny/guardrails.json](.bny/guardrails.json) — machine-readable constraints
- [.bny/roadmap.md](.bny/roadmap.md) — what's next
