# Project Structure

## Philosophy

- Not a framework — a template you clone and build on
- No ORMs, no build tools, pure Unix
- Runtime: Bun (fast TypeScript)

## Key Directories

| Directory | Purpose |
|-----------|--------|
| `src/` | Application source (handlers, lib) |
| `tests/` | Tests + fixtures |
| `specs/` | Feature specs (one dir per feature) |
| `.bny/` | Project state — git-tracked, per-project |
| `.bny/spin/` | Spin logs — gitignored runtime state |
| `bny/` | Dark factory CLI — tool code (**symlinkable** across projects) |
| `dev/` | Dev tooling — per-project customizable plumbing |
| `dna/` | Project knowledge — context only, no operational deps |
| `.githooks/` | Git hooks (pre-commit, pre-push) |
| `bin/bny` | Entry point — git-style subcommand dispatcher |

## Process Management

- **Assassin** — process cleanup (ensures child processes don't leak)
- **Ralph** — retry loop with bounded iterations (`--ralph --max-iter N`)

These are internal libraries in `bny/lib/`, not external dependencies.

## Commands

### Dev Scripts (Plumbing)

| Command | Purpose |
|---------|--------|
| `./dev/setup` | Install deps, configure git hooks |
| `./dev/test` | Run tests |
| `./dev/health` | System health check (JSON output) |
| `./dev/pre_flight` | Validate before starting work |
| `./dev/post_flight` | Validate before committing |

### Bny CLI (Orchestration)

| Command | Purpose |
|---------|--------|
| `bny next` | **Full pipeline** — reads roadmap, runs specify→plan→tasks→review→implement with one human gate |
| `bny next --auto` | **Autonomous pipeline** — same as `bny next` but skips all human checkpoints |
| `bny spin` | **Detached factory** — launches `bny next --auto` in a tmux session, returns immediately |
| `bny spin --attach` | Launch and attach to watch live |
| `bny spin --log` | Tail the latest spin log |
| `bny specify "..."` | Create feature branch + spec |
| `bny plan` | Create implementation plan |
| `bny tasks` | Generate task list |
| `bny review` | Gemini antagonist review |
| `bny implement` | Claude autonomous implementation |
| `bny status` | Show feature state |
| `bny ai init` | Bootstrap AI tool awareness (creates symlinks) |
| `bny dev test` | Wraps `./dev/test` |
| `bny dev pre-flight` | Wraps `./dev/pre_flight` |

`bny next` supports `--dry-run` (shows plan without executing), `--auto` (skip human gates), and `--max-iter N` (ralph iterations, default 5).

`bny spin` supports `--attach` (watch live), `--log` (tail latest), `--dry-run` (show what would launch). Includes duplicate detection via `tmux has-session`.

## Coding Conventions

- POD only — no classes for data, use interfaces and type aliases
- `snake_case` vars/functions, `PascalCase` types, `SCREAMING_SNAKE` constants
- `null` over `undefined`
- Guard early — return errors at function top
- Three similar lines > one premature abstraction
- I/O: stdin/stdout/stderr, exit codes, JSON lines
- Terminology: `params` for input, `result` for output
