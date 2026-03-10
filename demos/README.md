# demos

each demo was built from a single sentence. zero human intervention.

## three experiment types

### quick experiments (Bun/TypeScript)

```bash
./demos/run-experiment semver-resolver "a TypeScript library that parses semver version strings and evaluates npm-style range expressions (^, ~, >=, ||, hyphen ranges, x-ranges) to test whether versions satisfy constraints"
./demos/run-experiment cron-parser "a cron expression parser that validates standard 5-field cron expressions and computes the next N scheduled times from a given start time"
./demos/run-experiment json-patch "a TypeScript library implementing RFC 6902 JSON Patch — apply a sequence of add, remove, replace, move, copy, and test operations to a JSON document with atomic rollback on failure"
./demos/run-experiment fizzbuzz-api "a REST API that serves fizzbuzz over HTTP"
./demos/run-experiment word-counter "a CLI tool that counts words, lines, and characters in files"
./demos/run-experiment markdown-linter "a CLI that lints markdown files for common issues"
```

one command per project. seed → digest → storm → build → test. ~15 minutes each.

### SaaS discovery (Bun/TypeScript, heavy brane)

```bash
./demos/run-saas-experiment waitlist-api "a product launch waitlist API with referral tracking"
```

research → brainstorm → autonomous loop → propose → build. exercises the brane more deeply.

### Rails experiment (Ruby/Rails, heaviest brane)

```bash
./demos/run-rails-experiment
```

the showcase. bootstraps a Rails API project, then runs **5 brane operations** (3 storms + autonomous research loop + enhance) before writing any code. proves language-agnostic claims and demonstrates knowledge accumulation across the full pipeline. ~87 minutes. see [event-rsvp/README.md](event-rsvp/README.md) for the full writeup.

## what happens inside

**quick experiments:**

1. `bny init` — scaffold dev scripts and agent config
2. `bny digest seed.md` — feed the idea into the brane
3. `bny brane storm` + `bny brane ask` — brainstorm and query
4. `bny build --yes` — the dark factory: specify → challenge → plan → tasks → narrow[1→2→3] → verify → ruminate
5. `./dev/test` — run the generated tests

**rails experiment** adds before step 4:
- 3 targeted storms (domain, concurrency, API design)
- autonomous research loop (2 rounds — searches web, fetches sources, digests)
- convergent enhance (cross-references, resolves contradictions)
- 5 targeted brane queries (prove accumulated knowledge)
- 2 proposals generated and accepted

## results

| demo | type | seed | tests | brane files | result |
|------|------|------|-------|-------------|--------|
| semver-resolver | bun | "parses semver ranges (^, ~, >=, \|\|, hyphen, x-ranges)" | 54 | — | clean |
| json-patch | bun | "RFC 6902 JSON Patch with atomic rollback" | 37 | — | clean |
| cron-parser | bun | "cron expression parser, next N scheduled times" | 12 | — | clean |
| fizzbuzz-api | bun | "REST API that serves fizzbuzz over HTTP" | — | — | clean |
| word-counter | bun | "CLI that counts words, lines, and chars" | — | — | clean |
| markdown-linter | bun | "CLI that lints markdown files" | — | — | clean |
| **event-rsvp** | **rails** | **"Event RSVP API with capacity limits and waitlist promotion"** | **16** | **28** | **clean** |

## what's in each demo

```
seed.md           the one-sentence idea (or rich seed for rails)
experiment.log    full pipeline output
errors.log        errors (empty = clean run)
bny/              project state (brane, specs, roadmap)
  brane/worldview/  knowledge graph files
  proposals/        generated proposals (saas/rails only)
specs/            generated spec, plan, challenge, tasks
src/ or app/      generated source code
tests/ or spec/   generated tests
dev/              generated dev scripts
```

## re-running

```bash
# quick experiment
rm -rf demos/semver-resolver
./demos/run-experiment semver-resolver "a TypeScript library that parses semver version strings"

# rails experiment
rm -rf demos/event-rsvp
./demos/run-rails-experiment
```

results will vary — LLM outputs are non-deterministic.
