# qa

black-box QA harness for bunny. treats `bny` as an opaque binary. zero shared code with the pipeline.

## usage

```bash
bun qa/run.ts                     # run all 3 suites
bun qa/run.ts --suite semver      # run one
bun qa/run.ts --summary           # latest score per suite vs baseline
bun qa/run.ts --history           # KPI history
bun qa/run.ts --compare           # diff last 2 runs
bun qa/run.ts --baseline          # snapshot current scores as baseline
```

## suites

| name | category | stress test |
|------|----------|-------------|
| semver | algorithm | pure logic, edge case hell |
| kv-store | io + state | HTTP, persistence, time |
| json-patch | protocol | spec conformance, atomicity |

## how it works

1. creates a fresh temp dir with `git init`
2. runs `bny hop "the prompt"` — zero intervention
3. collects artifacts: source, tests, spec, plan
4. sends everything to claude: "find bugs the tests miss"
5. sends everything to gemini: same prompt, independent
6. scores: correctness, test quality, code quality, spec fidelity, defect count
7. saves to `qa/data/` as JSON, tracks KPIs over time

## KPIs

| metric | what it measures | direction |
|--------|-----------------|-----------|
| correctness | do tests pass for the right reasons? | higher = better |
| test_quality | adversarial or softballs? | higher = better |
| code_quality | idiomatic, simple, mergeable? | higher = better |
| spec_fidelity | does code match the prompt? | higher = better |
| defect_count | bugs found that tests missed | lower = better |
| overall | weighted composite (0.30/0.25/0.20/0.25 - 0.1*defects) | higher = better |

## when to run

- after changing prompts in specify/plan/implement/test-gen
- after changing the pipeline (phase order, retry logic, context assembly)
- after upgrading claude or gemini models
- before and after any PR that touches `src/`

## baseline

`qa/baseline.json` is tracked in git — the scores travel with the repo. run `--baseline` to snapshot current scores. `--summary` shows delta from baseline.

run data lives in `qa/data/` (gitignored). the harness and baseline are tracked.
