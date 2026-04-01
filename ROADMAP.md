# Roadmap

*This is the development roadmap for the bunny CLI tool itself. For the roadmap of a project being built with bunny, see `bny/roadmap.md`.*

## Next

- [ ] P1: `bny next` output is a wall of text — should be quiet progress lines on stderr, full JSON to a log file
- [ ] P1: Roadmap item parsing is fragile — `## Next` section format must match what `bny proposal accept` writes

## Done

- [x] P1: Dark testing stack — antagonistic agents own testing (challenge, test-gen, verify)
- [x] `bny build` without roadmap errors — use `bny spike` for ad-hoc builds
- [x] `bny proposal` derives topic from worldview when none given
- [x] `bny proposal accept` auto-accepts when only one proposal exists
- [x] Strip conversational preamble from AI-generated specs/plans/tasks
- [x] Centralized process spawning — `spawn_sync`, `spawn_async`, `which_check` in `src/lib/spawn.ts`
- [x] AI-generated specs/plans/tasks — specify, plan, tasks call claude with brane worldview
- [x] Kill `current-feature` state file — derive from highest specs/ dir
- [x] Default to auto — `bny next` and `bny build` run without prompts, `--interactive` to opt in
- [x] Fix ctrl-c during confirmation prompts
- [x] Fix empty error messages — centralized spawn always captures stdout+stderr+exit code
