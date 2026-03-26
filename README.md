# bunny

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDZ2N2ZscWE1YTduemtlaHFuZ2RkbXc4cmVkZ3dtNTRkZ2x2d3VhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vIemlpNzy5CSOli/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

a dark factory for solo developers. two adversarial AIs, one pipeline, a knowledge graph that compounds.

```
bny hop "add user auth"         # spec → plan → test → build
bny spike "prototype X"         # same thing, guardrails off
bny digest docs/                # feed the knowledge graph
bny brane ask "question"        # query it
bny brane storm "topic"         # brainstorm against it
bny brane tldr                  # what does it know?
```

auto-initializes. no setup required.


## how it works

gemini writes tests to break things. claude writes code to survive. neither sees the other's prompt.

```
bny hop "description"

  1. spec      claude specifies, gemini challenges
  2. plan      claude plans + generates tasks
  3. test      3×3 narrowing — gemini writes tests, claude implements
  4. build     implement + verify + retro + ruminate → knowledge graph
```

code ships when claude beats gemini's tests. then the graph learns.


## install

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="..."

cd my-project
curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash

bny hop "add rate limiting"
```

or from source:

```bash
git clone https://github.com/ahoward/bunny.git && cd bunny
./dev/setup
```


## the knowledge graph

every build feeds it. every build reads it. the tenth build knows what the first nine learned.

```bash
bny digest README.md docs/ src/            # ingest anything
bny digest https://example.com/api-docs    # URLs too

bny brane ask "security risks?"            # query
bny brane storm "real-time collab"         # diverge
bny brane enhance "auth model"             # converge
bny brane loop "distributed systems"       # autonomous research
bny brane tldr                             # outline
```


## 3×3 narrowing

three rounds. each more adversarial than the last.

| round | gemini writes | gemini sees | claude's job |
|-------|--------------|-------------|-------------|
| 1. contracts | spec-as-code | spec + challenge | build the foundation |
| 2. properties | invariants | spec + claude's source | don't break contracts |
| 3. boundaries | edge cases + golden files | spec + source + all tests | don't break anything |

max 9 test runs. typical ~4.


## proof

single sentence in, tested code out, zero human intervention:

| prompt | tests | result |
|--------|-------|--------|
| "a library that parses semver ranges (^, ~, >=, \|\|, hyphen, x-ranges)" | 54 | clean |
| "RFC 6902 JSON Patch — add, remove, replace, move, copy, test with atomic rollback" | 37 | clean |
| "a cron expression parser that computes the next N scheduled times" | 12 | clean |

see [demos/](demos/)


## commands

**pipeline**

```
bny hop "description"           # full pipeline
bny spike "description"         # exploratory, no guardrails
bny next                        # pick next roadmap item, run pipeline
```

**phases** (run individually)

```
bny spec "description"          # phase 1: specify + challenge
bny plan                        # phase 2: plan + tasks
bny test                        # phase 3: 3×3 narrowing
bny build                       # phase 4: implement + verify + retro
```

**knowledge**

```
bny digest <file|dir|url>       # ingest
bny brane ask "question"        # query
bny brane storm "topic"         # brainstorm
bny brane enhance "topic"       # refine
bny brane loop "topic"          # autonomous research
bny brane lens add NAME "desc"  # filtering perspectives
bny brane rebuild               # reprocess through lenses
bny brane tldr                  # outline
```

**chores**

```
bny ipm                         # iteration planning meeting
bny proposal "topic"            # generate proposals from graph
bny todo                        # manage todos
bny status                      # show feature state
bny map                         # structural codebase map (tree-sitter)
```


## environment

| variable | purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | claude — spec, plan, implement, ruminate |
| `GEMINI_API_KEY` | gemini — challenge, test-gen, verify |
| `BNY_MODEL` | override LLM model |
| `BUNNY_LOG` | structured logging to stderr |


## stack

bun. typescript. tree-sitter. no frameworks.


## links

- [AGENTS.md](AGENTS.md) — agent protocol
- [demos/](demos/) — complete projects from a single sentence
