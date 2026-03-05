# Tasks: 001-typescript-library-parses

# Task List: 001-typescript-library-parses

## Phase 1: Setup

- [ ] T001 Create feature branch `001-typescript-library-parses` from `main`
- [ ] T002 Create directory structure: `src/` and `tests/` directories
- [ ] T003 Verify `bun` is available and `bun test` runs (even with zero tests)

**Checkpoint:** `./dev/pre_flight` passes, empty `bun test` exits clean.

---

## Phase 2: Foundational Types

- [ ] T004 [US1,US2,US3,US4] Implement `src/types.ts` — define `SemVer`, `Comparator`, `ComparatorSet`, `Range`, `ParseResult<T>`, `ParseOptions` as readonly POD types

**Checkpoint:** `src/types.ts` compiles with `bun build src/types.ts --no-bundle`.

---

## Phase 3: Core Version Parsing & Formatting

- [ ] T005 [P] [US1,US2] Implement `src/parse.ts` — `parse(input, opts?) → ParseResult<SemVer>`: input guards (null/undefined/non-string, length > 256), strict 3-component split, prerelease/build extraction, numeric validation (no leading zeros, MAX_SAFE_INTEGER), loose mode (strip `v`/`=`, fill missing components)
- [ ] T006 [P] [US1] Implement `src/format.ts` — `format(v: SemVer) → string`: render `major.minor.patch` with optional `-prerelease` and `+build` suffixes
- [ ] T007 Run `./dev/test` — `parse.test.ts` and `round_trip.test.ts` pass

**Checkpoint:** US-001, US-002, US-012 acceptance criteria met. `./dev/test` green.

---

## Phase 4: Version Comparison

- [ ] T008 [US3] Implement `src/compare.ts` — `compare(a, b) → -1 | 0 | 1`: numeric comparison of major/minor/patch, prerelease precedence per semver 2.0.0 §11 (no-prerelease > has-prerelease, pairwise identifier comparison: numeric < string, numeric vs numeric as integers, string vs string lexicographic, shorter < longer), build metadata ignored
- [ ] T009 Run `./dev/test` — `compare.test.ts` passes

**Checkpoint:** US-003 acceptance criteria met. `./dev/test` green.

---

## Phase 5: Range Parsing & Desugaring

- [ ] T010 [US4,US5,US6,US7,US8,US9,US11] Implement internal helper `parse_partial` in `src/parse_range.ts` — parse partial version tokens (`1`, `1.2`, `1.x`, `*`, `1.2.x`) into `{ major, minor?, patch?, prerelease?, build? }`, reject invalid tokens with error result
- [ ] T011 [US8] Implement hyphen range expansion in `src/parse_range.ts` — detect ` - ` pattern, expand partial left (fill zeros → `>=`), expand full right (`<=`) or partial right (bump next significant → `<`)
- [ ] T012 [US9] Implement X-range expansion in `src/parse_range.ts` — expand `*`/`x`/`X`/empty → `>=0.0.0`, `1.x` → `>=1.0.0 <2.0.0`, `1.2.*` → `>=1.2.0 <1.3.0`
- [ ] T013 [US5] Implement caret range expansion in `src/parse_range.ts` — `^M.m.p` with zero-major (`^0.2.3` → `>=0.2.3 <0.3.0`), zero-zero-major (`^0.0.3` → `>=0.0.3 <0.0.4`), partial versions (`^1.2` → `>=1.2.0 <2.0.0`), prerelease passthrough
- [ ] T014 [US6] Implement tilde range expansion in `src/parse_range.ts` — `~M.m.p` → `>=M.m.p <M.(m+1).0`, `~M.m` → `>=M.m.0 <M.(m+1).0`, `~M` → `>=M.0.0 <(M+1).0.0`
- [ ] T015 [US4] Implement primitive comparator parsing in `src/parse_range.ts` — extract operator prefix (`>=`, `>`, `<=`, `<`, `=`, bare → `=`), parse version via `parse_partial`, convert to `Comparator`
- [ ] T016 [US7,US11] Implement top-level `parse_range(input) → ParseResult<Range>` in `src/parse_range.ts` — input guards (null/undefined, length > 1024), whitespace normalization, split on `||`, dispatch each set through hyphen → x-range → caret → tilde → primitive pipeline, return structured `Range`
- [ ] T017 Run `./dev/test` — `parse_range.test.ts` passes

**Checkpoint:** US-005 through US-009, US-011 range parsing criteria met. `./dev/test` green.

---

## Phase 6: Satisfies (Integration)

- [ ] T018 [US4,US5,US6,US7,US8,US9,US10] Implement `src/satisfies.ts` — `satisfies(version, range) → boolean`: parse string inputs, iterate comparator sets (OR), pre-release gate per FR-011 (version has prerelease → require same major.minor.patch tuple with prerelease in at least one comparator), evaluate each comparator (AND) via `compare` against operator, return boolean
- [ ] T019 Run `./dev/test` — `satisfies.test.ts` passes

**Checkpoint:** US-004 through US-010 full acceptance criteria met. `./dev/test` green.

---

## Phase 7: Public API & Polish

- [ ] T020 Implement `src/index.ts` — re-export `parse`, `format`, `compare`, `parse_range`, `satisfies` and all public types from `src/types.ts`
- [ ] T021 Run full test suite `./dev/test` — all test files green (parse, compare, parse_range, satisfies, round_trip)
- [ ] T022 Run `./dev/post_flight` — pre-commit validation passes
- [ ] T023 Append decision log entry to `bny/decisions.md`

**Checkpoint:** All success criteria (SC-01 through SC-10) met. `./dev/post_flight` green. Ready for commit.
