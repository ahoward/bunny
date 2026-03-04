# demos

each demo was built from a single sentence and the dark factory.

## how they were made

```bash
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
   specify → plan → tasks → review → implement → ruminate
7. `./dev/test` — run the generated tests

zero human intervention between step 1 and step 7.

## results

| demo | seed | source files | errors |
|------|------|-------------|--------|
| fizzbuzz-api | "a REST API that serves fizzbuzz over HTTP" | 3 | 0 |
| word-counter | "a CLI tool that counts words, lines, and characters in files" | 2 | 0 |
| markdown-linter | "a CLI that lints markdown files for common issues" | 6 | 0 |

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
rm -rf demos/fizzbuzz-api demos/word-counter demos/markdown-linter
./demos/run-experiment fizzbuzz-api "a REST API that serves fizzbuzz over HTTP"
```

results will vary — LLM outputs are non-deterministic.
