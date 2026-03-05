# demos

each demo was built from a single sentence and the dark factory.

## how they were made

```bash
./demos/run-experiment semver-resolver "a TypeScript library that parses semver version strings and evaluates npm-style range expressions (^, ~, >=, ||, hyphen ranges, x-ranges) to test whether versions satisfy constraints"
./demos/run-experiment cron-parser "a cron expression parser that validates standard 5-field cron expressions and computes the next N scheduled times from a given start time"
./demos/run-experiment json-patch "a TypeScript library implementing RFC 6902 JSON Patch — apply a sequence of add, remove, replace, move, copy, and test operations to a JSON document with atomic rollback on failure"
./demos/run-experiment fizzbuzz-api "a REST API that serves fizzbuzz over HTTP"
./demos/run-experiment word-counter "a CLI tool that counts words, lines, and characters in files"
./demos/run-experiment markdown-linter "a CLI that lints markdown files for common issues"
```

that's it. one command per project. here's what happens inside:

1. `bny init` — scaffold dev scripts and agent config (auto-runs `git init` if needed)
2. `bny digest seed.md` — feed the one-sentence idea into the brane
3. `bny brane storm` — divergent brainstorming against the idea
4. `bny brane tldr` — summarize what the brane knows
5. `bny brane ask` — query for key design decisions
6. `bny build --yes` — the dark factory runs the full pipeline:
   specify → challenge → plan → tasks → test-gen → review → implement → verify → ruminate
7. `./dev/test` — run the generated tests

zero human intervention between step 1 and step 7.

## results

| demo | seed | tests | result |
|------|------|-------|--------|
| semver-resolver | "parses semver ranges (^, ~, >=, \|\|, hyphen, x-ranges)" | 54 | clean |
| json-patch | "RFC 6902 JSON Patch with atomic rollback" | 37 | clean |
| cron-parser | "cron expression parser, next N scheduled times" | 12 | clean |
| fizzbuzz-api | "a REST API that serves fizzbuzz over HTTP" | — | clean |
| word-counter | "a CLI tool that counts words, lines, and characters in files" | — | clean |
| markdown-linter | "a CLI that lints markdown files for common issues" | — | clean |

## what's in each demo

```
seed.md           the one-sentence idea
experiment.log    full pipeline output
errors.log        errors (empty = clean run)
bny/              project state (brane, specs, roadmap)
specs/            generated spec, plan, tasks
src/              generated source code
tests/            generated tests
dev/              generated dev scripts
```

## re-running

```bash
rm -rf demos/semver-resolver
./demos/run-experiment semver-resolver "a TypeScript library that parses semver version strings and evaluates npm-style range expressions"
```

results will vary — LLM outputs are non-deterministic.
