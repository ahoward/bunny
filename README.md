# bunny

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDZ2N2ZscWE1YTduemtlaHFuZ2RkbXc4cmVkZ3dtNTRkZ2x2d3VhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vIemlpNzy5CSOli/giphy.gif" alt="frank" width="480"/>
  <br/>
  <em>"why are you wearing that stupid man suit?"</em>
</p>

an autonomous build system for solo developers. two adversarial LLMs (Claude writes code, Gemini writes tests to break it), one pipeline, and a persistent knowledge graph that compounds across builds.

```
bny hop "add user auth"         # spec → plan → test → build
bny spike "prototype X"         # same thing, guardrails off
bny digest docs/                # feed the knowledge graph
bny brane ask "question"        # query it
bny brane storm "topic"         # brainstorm against it
bny brane tldr                  # what does it know?
```

auto-initializes on first `bny` command. no explicit setup required.


## how it works

gemini writes tests to break things. claude writes code to survive them. neither sees the other's prompt.

```
bny hop "description"

  1. spec      claude specifies, gemini challenges
  2. plan      claude plans + generates tasks
  3. test      3×3 narrowing — gemini writes tests, claude implements
  4. build     implement + verify + retro + ruminate → knowledge graph
```

code ships when claude beats gemini's tests. then the graph learns.


## prerequisites

- [bun](https://bun.sh) >= 1.1.0
- [claude CLI](https://docs.anthropic.com/en/docs/claude-code) (Anthropic)
- [gemini CLI](https://github.com/google-gemini/gemini-cli) (Google)
- `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` in your environment


## install

from source:

```bash
git clone https://github.com/ahoward/bunny.git && cd bunny
./dev/setup
```

or via the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash
```

then add bunny's `bin/` to your PATH (or symlink `bin/bny` somewhere in your PATH):

```bash
export PATH="$PWD/bin:$PATH"  # or add to your shell profile
```

now, in any project directory:

```bash
bny hop "add rate limiting"
```


## the knowledge graph (brane)

the "brane" is a local file-based knowledge graph stored in `bny/brane/`. when you `digest` files, bunny extracts structure and context, storing them as markdown nodes that get injected into LLM prompts during builds. every build feeds it. every build reads it. the tenth build knows what the first nine learned.

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


## how is this different

most AI coding tools are either cooperative multi-agent systems (MetaGPT, ChatDev), human-in-the-loop pair programmers (Aider, Cursor), or cloud-hosted autonomous agents (Devin, Replit Agent). bunny is none of these.

| approach | examples | bunny's difference |
|----------|----------|--------------------|
| cooperative multi-agent | MetaGPT, ChatDev | agents collaborate — bunny's agents fight. gemini tries to break what claude builds. |
| pair programmer | Aider, Cursor, Cline | human stays in the loop — bunny runs unattended. |
| cloud autonomous agent | Devin, Factory.ai, Replit Agent | SaaS, team-oriented — bunny is local CLI, solo-developer, runs on your machine. |
| AI test generation | Qodo (CodiumAI) | generates tests only — bunny generates tests *and* code *and* verifies adversarially. |
| research | AgentCoder, Reflexion | papers, not tools — bunny ships. |

the specific combination — adversarial multi-LLM, phased pipeline, 3×3 narrowing, persistent knowledge graph, local-first CLI — is unoccupied.


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


## status

v0.0.1 — working but early. expect sharp edges.


## links

- [AGENTS.md](AGENTS.md) — agent protocol (also symlinked as CLAUDE.md and GEMINI.md)
- [demos/](demos/) — complete projects built from a single sentence
- [ROADMAP.md](ROADMAP.md) — bunny CLI development roadmap
