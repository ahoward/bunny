# bny

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDZ2N2ZscWE1YTduemtlaHFuZ2RkbXc4cmVkZ3dtNTRkZ2x2d3VhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vIemlpNzy5CSOli/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

a dark factory. ai agents build software autonomously — claude implements, gemini hardens, humans intervene only when stuck.

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

# --- knowledge base (brane) ---
bny brane eat README.md                      # ingest a file
bny brane eat docs/                          # ingest a directory
bny brane eat https://example.com/api.html   # ingest a URL
bny brane ask "what are the security risks?" # query the worldview
bny brane ask competitor-spec.md             # review a doc against worldview
bny brane pov add security "attack vectors, auth gaps, input validation"
bny brane pov add perf "latency, memory, algorithmic complexity"
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
bny ipm              # interactive planning session
bny ai init          # bootstrap ai tool awareness (symlinks)
bny dev test         # wraps ./dev/test
bny dev pre-flight   # wraps ./dev/pre_flight
```

### brane (knowledge graph)

```bash
bny brane eat <source>       # ingest file, directory, or URL
bny brane ask <question>     # query worldview (read-only)
bny brane ask <file>         # review a doc against worldview
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
bin/bny           entry point — git-style dispatcher
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
bny/              dark factory CLI — tool code (symlinkable)
  lib/            assassin, ralph, feature, prompt, brane
  ai/             ai subcommands (init)
  brane/          eat, ask, pov, digest
  dev/            wrappers for ./dev/* scripts
  templates/      spec, plan, tasks templates
  specify         create feature workspace
  plan            create implementation plan
  tasks           generate task list
  implement       claude autonomous implementation
  review          gemini antagonist review
  status          show feature state
  next            pick roadmap item, run full pipeline
  spin            autonomous — detached tmux factory run
  todo            project chore tracking
  ipm             interactive planning session
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

## cheatsheet

every `bny` command has a claude code slash command. type `/bny.` and tab-complete.

| slash command | cli equivalent | what it does |
|---------------|---------------|--------------|
| `/bny.specify` | `bny specify "..."` | create feature branch + spec |
| `/bny.plan` | `bny plan` | create implementation plan |
| `/bny.tasks` | `bny tasks` | generate task list |
| `/bny.implement` | `bny implement` | claude autonomous implementation |
| `/bny.review` | `bny review` | gemini antagonist review |
| `/bny.status` | `bny status` | show feature state |
| `/bny.next` | `bny next` | full pipeline from roadmap item |
| `/bny.spin` | `bny spin` | autonomous factory in detached tmux |
| `/bny.ipm` | `bny ipm` | iteration planning meeting |
| `/bny.ps` | `bny ps` | show running bny processes |
| `/bny.brane-eat` | `bny brane eat` | feed file/dir/url into brane |
| `/bny.brane-ask` | `bny brane ask` | query the worldview |
| `/bny.brane-digest` | `bny brane digest` | rebuild worldview from sources |
| `/bny.brane-pov` | `bny brane pov` | show/manage perspective lenses |

three-layer dispatch: **slash command** → claude runs **bny cli** → bny handles everything.

## more

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — full development process
- [bny/AGENTS.md](bny/AGENTS.md) — the protocol ai agents must follow
- [.bny/guardrails.json](.bny/guardrails.json) — machine-readable constraints
- [.bny/roadmap.md](.bny/roadmap.md) — what's next
