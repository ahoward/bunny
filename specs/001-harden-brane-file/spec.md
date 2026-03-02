# Feature Specification: Harden brane file ops

**Feature Branch**: `001-harden-brane-file`
**Created**: 2026-03-02
**Status**: Draft
**Input**: Security hardening from 4-perspective code review (3 Claude + 1 Gemini)

> **Protocol**: Before working on this spec, run `./dev/pre_flight`. After any code change, run `./dev/test`. Before committing, run `./dev/post_flight`. See `bny/AGENTS.md` and `.bny/guardrails.json` for full constraints.

## User Scenarios & Testing

### User Story 1 - Path traversal guard (Priority: P1)

When Claude generates worldview file operations (eat, enhance, storm, digest, ruminate), the LLM-returned path could contain `../` sequences that escape the `worldview/` directory. `apply_operations()` and `preview_operations()` must reject these paths.

**Why this priority**: Security — an LLM hallucination or prompt injection could write files anywhere on the filesystem.

**Independent Test**: Unit test `parse_json()` response with `../../../etc/passwd` path and verify it's rejected.

**Acceptance Scenarios**:

1. **Given** an operation with path `../escape.md`, **When** `apply_operations()` processes it, **Then** it throws an error and writes nothing.
2. **Given** an operation with path `subdir/../other.md` (resolves inside worldview), **When** processed, **Then** it succeeds normally.
3. **Given** an operation with path `topics/valid.md`, **When** processed, **Then** it writes to `worldview/topics/valid.md` as before.

---

### User Story 2 - File descriptor leak fix (Priority: P1)

`confirm_intake()` in `brane.ts` opens `/dev/tty` via `openSync()` but has no try/finally around the read. If `readSync()` throws, the fd leaks. Same pattern exists in `next.ts` `confirm()`.

**Why this priority**: Resource leak — in loops (ipm, digest), leaked fds accumulate.

**Independent Test**: Verify the function works in both success and error paths without leaking.

**Acceptance Scenarios**:

1. **Given** a TTY environment, **When** `confirm_intake()` reads user input, **Then** the fd is always closed (even on error).
2. **Given** a non-TTY environment (piped), **When** `confirm_intake()` is called, **Then** it auto-confirms without opening `/dev/tty`.

---

### User Story 3 - parseInt validation (Priority: P2)

`bin/bny.ts` parses `--max-iter`, `--max-budget`, and `--timeout` without checking for NaN. `--max-iter abc` silently produces NaN which breaks ralph.

**Why this priority**: Correctness — silent NaN propagation causes confusing downstream failures.

**Independent Test**: Pass invalid numeric args and verify clear error messages.

**Acceptance Scenarios**:

1. **Given** `bny --max-iter abc implement`, **When** args are parsed, **Then** stderr shows an error and exits 1.
2. **Given** `bny --max-iter 5 implement`, **When** args are parsed, **Then** it works as before.
3. **Given** `bny --timeout -1 implement`, **When** args are parsed, **Then** stderr shows an error and exits 1.

---

### Edge Cases

- Path with encoded characters (`%2e%2e/`) — should be rejected
- Empty path string — should be rejected
- Path that resolves inside worldview but starts with `..` (e.g., `../worldview/ok.md` from parent) — should be rejected (strict: must not start with `..` after relative())
- `/dev/tty` not available (CI, Docker) — confirm_intake already handles this via isTTY check

## Requirements

### Functional Requirements

- **FR-001**: `apply_operations()` MUST validate that every resolved path is within `worldview_dir` before writing
- **FR-002**: `preview_operations()` MUST validate paths identically to `apply_operations()`
- **FR-003**: `confirm_intake()` MUST use try/finally to ensure `/dev/tty` fd is always closed
- **FR-004**: `next.ts` `confirm()` MUST use the same try/finally pattern
- **FR-005**: `bin/bny.ts` MUST validate parseInt/parseFloat results and exit with error on NaN
- **FR-006**: Path validation errors MUST be logged to stderr with the offending path

## Success Criteria

### Measurable Outcomes

- **SC-001**: All existing tests pass (139 pass, 9 pre-existing sample failures)
- **SC-002**: `apply_operations()` with `../escape.md` path throws instead of writing outside worldview
- **SC-003**: `--max-iter abc` produces a clear error message on stderr
- **SC-004**: No leaked file descriptors in confirm_intake() error paths
