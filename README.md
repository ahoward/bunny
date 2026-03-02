# bny

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDZ2N2ZscWE1YTduemtlaHFuZ2RkbXc4cmVkZ3dtNTRkZ2x2d3VhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vIemlpNzy5CSOli/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

## the idea

most ai coding tools treat each task as isolated. write code, move on.
knowledge evaporates between sessions.

bny is different. it's a strange loop — a factory that learns from its own output.

1. **seed** — you write a roadmap item. a sentence describing what you want.
2. **build** — the factory runs autonomously: spec, plan, review, implement.
3. **reflect** — after building, it ruminates: extracts patterns, decisions, gaps.
4. **grow** — insights feed back into the worldview, making the next iteration smarter.

each pass compounds knowledge. the factory doesn't just build — it learns to build better.

the human's role: seed ideas, review output, course-correct.
not scheduling. not gluing steps together.

## the loop

```
seed idea → specify → plan → tasks → review → implement
                                                   ↓
                                               ruminate
                                                   ↓
                                             brane learns
                                                   ↓
                                         next iteration (smarter)
```

four actors:

1. **claude** designs tests and implements code
2. **gemini** reviews for blind spots, edge cases, security holes
3. **brane** remembers — accumulates knowledge across iterations
4. **human** seeds ideas, reviews output, intervenes when stuck

tests are locked after gemini review. no changing them without human approval.

## tl;dr

```bash
# --- setup ---
git clone <repo> && cd bunny && ./dev/setup
export PATH="./bin:$PATH"

# --- build a feature (the dark factory) ---
bny next                                     # pick roadmap item, run full pipeline
bny next --dry-run                           # show what would run
bny spin                                     # autonomous — run detached in tmux
bny spin --attach                            # launch and watch live
bny spin --log                               # tail the latest spin log

# --- or step by step ---
bny specify "add user authentication"       # branch + spec
bny plan                                     # implementation plan
bny tasks                                    # task breakdown
bny review                                   # gemini pokes holes
bny --ralph --max-iter 10 implement          # claude builds, retries until green
bny ruminate                                 # reflect on build, feed brane
bny map                                      # structural codebase map (tree-sitter)
bny map src/ lib/                            # map specific directories
bny map --json                               # machine-readable output

# --- knowledge base (brane) ---
bny brane eat README.md                      # ingest a file
bny brane eat docs/                          # ingest a directory
bny brane eat https://example.com/api.html   # ingest a URL
bny brane ask "what are the security risks?" # query the worldview
bny brane ask competitor-spec.md             # review a doc against worldview
bny brane pov add security "attack vectors, auth gaps, input validation"
bny brane pov add perf "latency, memory, algorithmic complexity"
bny brane storm "what about real-time collab?" # brainstorm — divergent expansion
bny brane storm seed.md --rounds 2           # multi-round storm from a file
bny brane enhance                            # refine — convergent sharpening
bny brane enhance "security model"           # focus refinement on a topic
bny brane digest                             # rebuild worldview through current lenses
bny brane pov                                # list active povs

# --- project chores ---
bny todo add "upgrade bun to 1.4"           # add a todo
bny todo                                     # list todos
bny todo done 1                              # mark done
bny todo promote 2                           # escalate to gh issue

# --- iteration planning ---
bny ipm                                      # interactive planning session

# --- plumbing ---
./dev/test                                   # run tests
./dev/health                                 # system health (json)
./dev/pre_flight                             # validate before work
./dev/post_flight                            # validate before commit
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

bny compiles to a single 58MB binary. no runtime dependencies beyond git.

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
bun build --compile bin/bny.ts --outfile bny    # 58MB arm64 binary
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

- [claude](https://claude.ai/cli) CLI (for brane, implement, specify, plan)
- [gemini](https://ai.google.dev/gemini-api/docs/cli) CLI (for review — optional)
- git
- [bun](https://bun.sh) (only needed for symlink install or building from source)

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
bny ruminate         # reflect on build, feed brane
bny map              # structural codebase map (tree-sitter)
bny status           # show feature state
bny ipm              # interactive planning session
bny init             # scaffold .bny/, dev/, .githooks/ for a new project
bny ai init          # bootstrap ai tool awareness (symlinks)
bny dev test         # wraps ./dev/test
bny dev pre-flight   # wraps ./dev/pre_flight
```

### brane (knowledge graph)

```bash
bny brane eat <source>       # ingest file, directory, or URL
bny brane ask <question>     # query worldview (read-only)
bny brane ask <file>         # review a doc against worldview
bny brane storm [seed]       # divergent brainstorming (expand outward)
bny brane enhance [focus]    # convergent refinement (sharpen inward)
bny brane pov                # list points of view
bny brane pov add <n> <desc> # add a perspective lens
bny brane pov on|off <name>  # toggle a pov
bny brane digest             # rebuild worldview from all stashed sources
```

sources are stashed on every eat. `digest` re-eats them all through your current lenses — add a pov, digest, get a new worldview. sources are git-tracked. for large branes, add a `.gitattributes` with git-lfs.

### todo (project chores)

```bash
bny todo                     # list
bny todo add "..."           # add
bny todo done <n>            # mark done
bny todo rm <n>              # remove
bny todo promote <n>         # escalate to gh issue
```

### ralph (retry loop)

```bash
bny --ralph --max-iter 10 implement    # retry until green or max iterations
bny --ralph --max-iter 5 review        # retry review too
```

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
  brane/          knowledge graph
    worldview/    self-organizing markdown knowledge base
    povs/         perspective lenses (all.md is default)
    sources/      stashed raw inputs (for digest)
    state.json    active povs
bny/              dark factory CLI source (.ts files, symlinkable)
  lib/            assassin, ralph, feature, prompt, brane, map
  ai/             ai subcommands (init)
  brane/          eat, ask, pov, digest, storm, enhance
  dev/            wrappers for ./dev/* scripts
  templates/      spec, plan, tasks templates
  init.ts         scaffold a project for bny
  specify.ts      create feature workspace
  plan.ts         create implementation plan
  tasks.ts        generate task list
  implement.ts    claude autonomous implementation
  review.ts       gemini antagonist review
  ruminate.ts     reflect on build, feed brane
  map.ts          structural codebase map (tree-sitter)
  status.ts       show feature state
  next.ts         pick roadmap item, run full pipeline
  spin.ts         autonomous — detached tmux factory run
  todo.ts         project chore tracking
  ipm.ts          interactive planning session
dev/              per-project customizable plumbing (shebangs, chmod +x)
src/              application source
  handlers/       app.call handlers (one file per endpoint)
  lib/            types, result helpers, logging
tests/            tests + fixtures
specs/            feature specs (one dir per feature)
samples/          projects built entirely by bny (proof it works)
  mood/           team mood tracker API
  tldr/           CLI file/URL summarizer
  shelf/          personal bookmarks with tags + search
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
| terminology | `params` for input, `result` for output |

## cheatsheet

every `bny` command has a claude code slash command. type `/bny.` and tab-complete.

| slash command | cli equivalent | what it does |
|---------------|---------------|--------------|
| `/bny.specify` | `bny specify "..."` | create feature branch + spec |
| `/bny.plan` | `bny plan` | create implementation plan |
| `/bny.tasks` | `bny tasks` | generate task list |
| `/bny.implement` | `bny implement` | claude autonomous implementation |
| `/bny.review` | `bny review` | gemini antagonist review |
| `/bny.ruminate` | `bny ruminate` | reflect on build, feed brane |
| `/bny.map` | `bny map` | structural codebase map (tree-sitter) |
| `/bny.status` | `bny status` | show feature state |
| `/bny.next` | `bny next` | full pipeline from roadmap item |
| `/bny.spin` | `bny spin` | autonomous factory in detached tmux |
| `/bny.ipm` | `bny ipm` | iteration planning meeting |
| `/bny.ps` | `bny ps` | show running bny processes |
| `/bny.brane-eat` | `bny brane eat` | feed file/dir/url into brane |
| `/bny.brane-ask` | `bny brane ask` | query the worldview |
| `/bny.brane-storm` | `bny brane storm` | divergent brainstorming |
| `/bny.brane-enhance` | `bny brane enhance` | convergent refinement |
| `/bny.brane-digest` | `bny brane digest` | rebuild worldview from sources |
| `/bny.brane-pov` | `bny brane pov` | show/manage perspective lenses |

three-layer dispatch: **slash command** → claude runs **bny cli** → bny handles everything.

## proof

three projects built entirely by bny — from a one-paragraph seed to working code. no human wrote any application code.

| sample | seed | what it builds |
|--------|------|---------------|
| [mood](samples/mood/) | "team mood tracker API" | JSON API — post moods, view 30-day trends |
| [tldr](samples/tldr/) | "CLI file/URL summarizer" | CLI tool — pipe-friendly, cached summaries |
| [shelf](samples/shelf/) | "personal bookmarks with tags" | JSON API — tags, search, markdown export |

each sample is a standalone bny project. `cd samples/mood && bun bin/bny next --auto` to watch the factory build.

see [samples/](samples/) for details.

## more

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — full development process
- [bny/AGENTS.md](bny/AGENTS.md) — the protocol ai agents must follow
- [.bny/guardrails.json](.bny/guardrails.json) — machine-readable constraints
- [.bny/roadmap.md](.bny/roadmap.md) — what's next
