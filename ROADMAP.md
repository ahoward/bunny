# Roadmap

## Next

- [ ] P0: `bny build` without roadmap should error — use `bny spike` for ad-hoc builds
- [ ] P0: `bny proposal` should derive topic from worldview when none given
- [ ] P0: `bny proposal accept` should auto-accept when only one proposal exists
- [ ] P0: Strip conversational preamble from AI-generated specs/plans/tasks — "The spec is ready..." leaks into output
- [ ] P1: Generated code has no tests — AGENTS.md/CLAUDE.md need TDD enforcement, `bny init` should scaffold working `dev/test` that runs `bun test`, agent protocol must say "tests MUST exist before implementation"
- [ ] P1: `bny next` output is a wall of text — should be quiet progress lines on stderr, full JSON to a log file
- [ ] P1: Roadmap item parsing is fragile — `## Next` section format must match what `bny proposal accept` writes

## Done

- [x] Centralized process spawning — `spawn_sync`, `spawn_async`, `which_check` in `src/lib/spawn.ts`
- [x] AI-generated specs/plans/tasks — specify, plan, tasks call claude with brane worldview
- [x] Kill `current-feature` state file — derive from highest specs/ dir
- [x] Default to auto — `bny next` and `bny build` run without prompts, `--interactive` to opt in
- [x] Fix ctrl-c during confirmation prompts
- [x] Fix empty error messages — centralized spawn always captures stdout+stderr+exit code
