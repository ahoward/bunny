# bny

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDZ2N2ZscWE1YTduemtlaHFuZ2RkbXc4cmVkZ3dtNTRkZ2x2d3VhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vIemlpNzy5CSOli/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

## mobius development

most ai coding tools treat each task as isolated. write code, move on.
knowledge evaporates between sessions.

bny is different. it implements **mobius development** — one continuous surface where knowledge becomes code becomes knowledge. there is no seam between thinking and building.

```
seed → feed → think → propose → build → ruminate
  ↑                                         |
  └─────────────────────────────────────────┘
```

start with a sentence. the brane learns about it. thought loops search the web, fetch sources, sharpen the worldview. proposals emerge from accumulated knowledge. the dark factory builds them — specify, plan, review, implement — and rumination feeds lessons back into the brane.

every cycle compounds. disposable code still teaches the brane something. the two outcomes of every build are:

1. **usable software** specific to your context
2. **refined worldview** — even throwaway spikes sharpen understanding

rigor used to be expensive. iterative waterfall died because humans couldn't afford the ceremony. llms removed that cost constraint. bny brings the rigor back — spec, plan, adversarial review, test-first implementation, post-build reflection — because now it's free.

the human's role: seed ideas, review output, course-correct.
not scheduling. not gluing steps together.

## the happy path

```bash
# --- 0. setup ---
git clone <repo> && cd my-project && ./dev/setup
export PATH="./bin:$PATH"

# --- 1. seed — tell the brane what you care about ---
bny brane eat README.md                           # ingest existing knowledge
bny brane eat https://example.com/api-docs        # ingest a URL
bny brane eat docs/                               # ingest a directory
bny brane pov add security "attack vectors, auth gaps, input validation"
bny brane pov add perf "latency, memory, algorithmic complexity"

# --- 2. think — let the brane explore autonomously ---
bny brane storm "what about real-time collaboration?"
bny brane loop "distributed consensus patterns"   # web search, fetch, eat, repeat
bny brane loop --rounds 5 --yes "auth strategies" # 5 rounds, auto-incorporate
bny brane enhance "security model"                # sharpen what you've learned

# --- 3. propose — bridge knowledge to execution ---
bny proposal "auth system"                        # brane generates a proposal
bny proposal --count 3 "backend architecture"     # generate 3 proposals
bny proposal accept auth-system                   # accepted → roadmap item

# --- 4. build — the dark factory ---
bny build                                         # full pipeline: specify → plan → review → implement → ruminate
bny build specify "add user auth"                 # just the specify step
bny build implement                               # just the implement step
bny --effort full build                           # 10 retries, $5 budget
bny spin                                          # run detached in tmux

# --- 5. spike — build without guardrails ---
bny spike "prototype oauth flow"                  # no review, no locked tests, exploratory
bny spike implement                               # just implement, fast and loose

# --- 6. ruminate — close the loop ---
bny ruminate                                      # reflect on build, feed brane
bny brane tldr                                    # see what the brane knows now
```

four actors:

1. **claude** designs tests and implements code
2. **gemini** reviews for blind spots, edge cases, security holes
3. **brane** remembers — accumulates knowledge across iterations
4. **human** seeds ideas, reviews output, intervenes when stuck

## commands

### build (dark factory)

the build pipeline. runs all steps by default, or one step at a time.
each step is a subcommand — brutal consistency.

```bash
bny build                                         # full pipeline
bny build "add user auth"                         # full pipeline with description
bny build specify "add user auth"                 # create spec
bny build plan                                    # create implementation plan
bny build tasks                                   # generate task list
bny build review                                  # gemini antagonist review
bny build implement                               # claude builds it
bny build ruminate                                # reflect, feed brane
bny build --dry-run                               # show what would run
```

### spike (exploratory)

same interface as build, guardrails off. no gemini review.
no test-first. no locked specs. output is explicitly disposable — but the
brane still learns from it.

```bash
bny spike "prototype websocket layer"             # full pipeline, no review
bny spike implement                               # just implement, fast
```

### brane (knowledge)

persistent knowledge graph. worldview files are self-organizing markdown.
sources are stashed on every eat. `digest` re-eats them all through current
lenses — add a pov, digest, get a new worldview.

```bash
bny brane eat <source>                            # ingest file, directory, or URL
bny brane ask "what are the security risks?"      # query worldview (read-only)
bny brane ask competitor-spec.md                  # review a doc against worldview
bny brane storm "real-time collab?"               # divergent brainstorming
bny brane enhance "security model"                # convergent refinement
bny brane loop "distributed systems"              # autonomous thought loop
bny brane loop --rounds 5 --yes "auth patterns"   # multi-round, auto-incorporate
bny brane loop --resume distributed-systems       # resume existing loop
bny brane loop list                               # show all loops
bny brane tldr                                    # instant worldview outline (zero LLM)
bny brane digest                                  # rebuild worldview through current lenses
bny brane pov                                     # list active perspectives
bny brane pov add security "attack vectors, auth" # add a perspective lens
bny brane pov on|off <name>                       # toggle a pov
```

### proposal (bridge)

bridge between knowledge (brane) and execution (roadmap).

```bash
bny proposal "auth system"                        # generate proposal
bny proposal --count 3 "backend"                  # generate multiple
bny proposal accept auth-system                   # accept → roadmap item
bny proposal --dry-run "topic"                    # print prompt only
```

### orchestration

```bash
bny next                                          # pick roadmap item, run full pipeline
bny spin                                          # autonomous — run detached in tmux
bny spin --attach                                 # launch and watch live
bny spin --log                                    # tail the latest spin log
bny map                                           # structural codebase map (tree-sitter)
bny map src/ lib/                                 # map specific directories
bny map --json                                    # machine-readable output
```

### project

```bash
bny todo                                          # list project todos
bny todo add "upgrade bun to 1.4"                 # add a todo
bny todo done 1                                   # mark done
bny todo promote 2                                # escalate to gh issue
bny close-issue 42                                # close github issue
bny ipm                                           # iteration planning meeting
bny status                                        # show feature state
bny ps                                            # show running bny processes
```

### dev (plumbing)

```bash
./dev/setup                                       # install deps, configure git hooks
./dev/test                                        # run tests
./dev/health                                      # system health check (json)
./dev/pre_flight                                  # validate before starting work
./dev/post_flight                                 # validate before committing
```

### ralph (retry loop)

any command can be wrapped with ralph for retry loops.

```bash
bny --effort little build                         # 2 iters, $0.50, 2min timeout
bny --effort some build                           # 5 iters, $2, 5min timeout
bny --effort full build                           # 10 iters, $5, 10min timeout
bny --effort max build                            # unlimited
bny --ralph --max-iter 10 build implement         # explicit limits
```

## stack

- **runtime:** [bun](https://bun.sh) — fast typescript runtime
- **language:** typescript (strict mode)
- **cli:** `bin/bny` — git-style subcommand dispatcher
- **process management:** assassin (cleanup) + ralph (retry loops)
- **code awareness:** [tree-sitter](https://tree-sitter.github.io/) via WASM — structural codebase maps
- **no frameworks.** no orms. no build tools. pure unix.

## quick start

```bash
# install into any git repo
cd my-project
curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash
export PATH="./bin:$PATH"
bny status           # see current state

# or from source
git clone https://github.com/ahoward/bunny.git && cd bunny
./dev/setup          # install deps, configure git hooks
export PATH="./bin:$PATH"
./dev/test           # verify everything works
```

## installing bny into a project

### binary install (recommended)

bny compiles to a single binary. no runtime dependencies beyond git.

```bash
# new project
mkdir my-project && cd my-project && git init
curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash

# existing project
cd my-project
curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash
```

this downloads the `bny` binary to `./bin/bny` and runs `bny init` to scaffold `.bny/`, `dev/`, and `.githooks/`.

```bash
export PATH="./bin:$PATH"
bny status                               # verify install
```

**upgrading:** re-run the installer. it replaces the binary and skips existing files.

### build from source

```bash
git clone https://github.com/ahoward/bunny.git
cd bunny
bun build --compile bin/bny.ts --outfile bny
cp bny /path/to/your-project/bin/bny
cd /path/to/your-project
./bin/bny init
```

### symlink install (development)

for hacking on bny itself, symlink the tooling:

```bash
git clone https://github.com/ahoward/bunny.git ~/tools/bunny
cd my-project
mkdir -p bin
ln -s ~/tools/bunny/bny bny
ln -s ~/tools/bunny/bin/bny bin/bny
cp -r ~/tools/bunny/dev dev && chmod +x dev/*
bin/bny init --minimal                    # just .bny/ state
```

### prerequisites

- [claude](https://claude.ai/cli) CLI (for brane, build, spike)
- [gemini](https://ai.google.dev/gemini-api/docs/cli) CLI (for review — optional)
- git
- [bun](https://bun.sh) (only needed for symlink install or building from source)

## directory layout

```
bin/bny           compiled binary (or symlink) — single entry point
bin/bny.ts        unified entry point source (compiles to bin/bny)
.bny/             project state (git-tracked, per-project)
  roadmap.md      what to work on next
  guardrails.json agent constraints (blast radius, protected files)
  decisions.md    append-only decision log
  constitution.md project principles
  todos.md        project chores
  proposals/      generated proposals (bridge: knowledge → execution)
  loops/          persistent thought loop state
  brane/          knowledge graph
    worldview/    self-organizing markdown knowledge base
    povs/         perspective lenses (all.md is default)
    sources/      stashed raw inputs (for digest)
    state.json    active povs
bny/              dark factory CLI source (.ts files, symlinkable)
  lib/            assassin, ralph, feature, prompt, brane, map, spinner
  ai/             ai subcommands (init)
  brane/          eat, ask, pov, digest, storm, enhance, tldr, loop
  dev/            wrappers for ./dev/* scripts
  build.ts        the dark factory (full pipeline or per-step)
  spike.ts        exploratory builds (guardrails off)
  proposal.ts     brane → roadmap bridge
  map.ts          structural codebase map (tree-sitter)
  ruminate.ts     post-build reflection
  next.ts         pick roadmap item, run full pipeline
  spin.ts         autonomous factory run (tmux)
  todo.ts         project chore tracking
  init.ts         scaffold a project for bny
dev/              per-project customizable plumbing (shebangs, chmod +x)
src/              application source
  handlers/       app.call handlers (one file per endpoint)
  lib/            types, result helpers, logging
tests/            tests + fixtures
specs/            feature specs (one dir per feature)
samples/          projects built entirely by bny (proof it works)
dna/              project knowledge — context only, no operational deps
.githooks/        pre-commit (post_flight), pre-push (test)
install.sh        curl|bash installer (downloads binary + runs init)
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
| cli | brutal consistency — `bny <noun> <verb>`, subcommands run all by default |
| terminology | `params` for input, `result` for output |

## cheatsheet

most `bny` commands have a claude code slash command. type `/bny.` and tab-complete.

three-layer dispatch: **slash command** → claude runs **bny cli** → bny handles everything.

## proof

projects built entirely by bny — from a one-paragraph seed to working code. no human wrote any application code.

| sample | seed | what it builds |
|--------|------|---------------|
| [mood](samples/mood/) | "team mood tracker API" | JSON API — post moods, view 30-day trends |
| [tldr](samples/tldr/) | "CLI file/URL summarizer" | CLI tool — pipe-friendly, cached summaries |
| [shelf](samples/shelf/) | "personal bookmarks with tags" | JSON API — tags, search, markdown export |

each sample is a standalone bny project. `cd samples/mood && bny build` to watch the factory build.

see [samples/](samples/) for details.

## more

- [bny/AGENTS.md](bny/AGENTS.md) — the protocol ai agents must follow
- [.bny/guardrails.json](.bny/guardrails.json) — machine-readable constraints
- [.bny/roadmap.md](.bny/roadmap.md) — what's next
