# Bunny - Claude Code Context

## What This Is

Bunny is a Bun + TypeScript project template with spec-kit and DNA systems.

## Key Files

- `./dna/product/ROADMAP.md` - **START HERE** — Driving task list for all development
- `./.specify/memory/constitution.md` - Project principles
- `./dna/technical/development-loop.md` - Antagonistic Testing process

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
bun run dev       # Run
bun test          # Test
bun run build     # Compile binary
```

## Directory Structure

```
src/              # source code
tests/            # tests
specs/            # feature specs (from /speckit.specify)
dna/              # project knowledge
.specify/         # spec-kit templates and memory
```

## Workflow: Picking Up Work

1. Read `dna/product/ROADMAP.md` — find "Next" item
2. Run `/speckit.specify` — creates `specs/{feature}/spec.md`
3. Open PR for human review
4. After approval: `/speckit.plan` → `/speckit.tasks`
5. Review tests with Gemini (antagonist)
6. Implement via `/speckit.implement`
7. If stuck (tests won't pass) → Human checkpoint
8. On completion → Update ROADMAP.md, mark feature complete

## Don't

- Use classes for data
- Throw exceptions for control flow
- Implement without tests
- Skip Gemini review
- Change tests after review without human approval
