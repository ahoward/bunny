# Bunny - Claude Code Context

## What This Is

Bunny is a Bun + TypeScript project template with spec-kit and DNA systems.

## Key Files

- `./dna/product/ROADMAP.md` - **START HERE** — Driving task list for all development
- `./.specify/memory/constitution.md` - Project principles
- `./dna/technical/development-loop.md` - Antagonistic Testing process
- `./dna/guardrails.json` - Machine-readable agent constraints

## Protocol

**You MUST follow this protocol. It is not optional.**

| When | Run | Why |
|------|-----|-----|
| Before starting work | `./script/pre_flight` | Confirms environment is ready |
| After any code change | `./script/test` | Catches regressions immediately |
| Before committing | `./script/post_flight` | Enforced by git hook — commit will fail if broken |
| To check system health | `./script/health` | Exercises app infrastructure beyond ping |
| After cloning | `./script/setup` | Installs deps, configures git hooks |

All scripts return structured output (Result envelope or exit codes). Parse them, don't ignore them.

### Guardrails

Read `dna/guardrails.json` before starting work. It defines:
- **protected_files** — never modify without human approval
- **blast_radius** — max files/lines per PR, dependency rules
- **forbidden_actions** — never do these autonomously
- **require_human_approval** — ask before doing these

### After completing work

Append a one-liner to `dna/decisions.md` recording what you did and why.

## Development Process: Antagonistic Testing

**See:** `./dna/technical/development-loop.md` and `.specify/memory/constitution.md`

1. Design interface → 2. Design tests (Claude) → 3. Review tests (Gemini)
4. Implement → 5. Loop until green → 6. **Human checkpoint** (only if stuck)

## Coding Conventions

1. **POD only** - Plain Old Data in/out, no classes for data
2. **Guard early** - Return errors at function top
3. **snake_case** - Variables, functions, file names
4. **null over undefined** - Explicit absence
5. **Simplicity** - Three similar lines > one premature abstraction

## Commands

```bash
./script/setup        # Install deps, configure git hooks
./script/test         # Run tests
./script/health       # Check system health
./script/pre_flight   # Pre-work validation
./script/post_flight  # Pre-commit validation
```

## Directory Structure

```
src/              # source code
  handlers/       # app.call handlers (one file per endpoint)
  lib/            # shared types, result helpers, logging
tests/            # tests
  fixtures/       # deterministic test inputs (POD)
specs/            # feature specs (from /speckit.specify)
dna/              # project knowledge
  guardrails.json # agent constraints (machine-readable)
  decisions.md    # append-only decision log
script/           # executable scripts (shebang, chmod +x)
.githooks/        # git hooks (pre-commit, pre-push)
.specify/         # spec-kit templates and memory
```

## Workflow: Picking Up Work

1. Run `./script/pre_flight` — confirm environment is ready
2. Read `dna/product/ROADMAP.md` — find "Next" item
3. Read `dna/guardrails.json` — know the constraints
4. Run `/speckit.specify` — creates `specs/{feature}/spec.md`
5. Open PR for human review
6. After approval: `/speckit.plan` → `/speckit.tasks`
7. Review tests with Gemini (antagonist)
8. Implement via `/speckit.implement`
9. Run `./script/test` after every change
10. Run `./script/post_flight` before committing
11. If stuck (tests won't pass) → Human checkpoint
12. On completion → Update ROADMAP.md, append to `dna/decisions.md`

## Don't

- Use classes for data
- Throw exceptions for control flow
- Implement without tests
- Skip Gemini review
- Change tests after review without human approval
- Commit without running `./script/post_flight`
- Ignore `dna/guardrails.json` constraints
- Modify protected files without human approval
