# Feature Specification: Core summarizer

**Feature Branch**: `004-core-summarizer`
**Created**: 2026-03-01
**Status**: Complete
**Input**: User description: "Core summarizer — read a file path argument, send contents to Claude API, print a concise summary to stdout"

## User Scenarios & Testing

### User Story 1 - Summarize a local file (Priority: P1)

A developer runs `tldr README.md` and gets a concise plain-text summary printed to stdout. This is the core value proposition — turn any file into a quick summary.

**Why this priority**: This is the fundamental feature. Everything else (URL support, caching) builds on this.

**Independent Test**: Run `tldr tests/fixtures/summarize/sample.txt` and verify summary output appears on stdout.

**Acceptance Scenarios**:

1. **Given** a valid file path, **When** `tldr <path>` is run, **Then** a concise summary prints to stdout
2. **Given** no arguments, **When** `tldr` is run, **Then** usage is printed to stderr and exit code is 1
3. **Given** a nonexistent file, **When** `tldr missing.txt` is run, **Then** an error prints to stderr and exit code is 1
4. **Given** no ANTHROPIC_API_KEY, **When** `tldr <path>` is run, **Then** an error about the missing key prints to stderr

### Edge Cases

- Empty file returns an error (nothing to summarize)
- File over 1MB is rejected (guard against token explosion)
- Non-string file_path is rejected with validation error
- Missing ANTHROPIC_API_KEY returns a clear error message

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept a file path as a CLI argument
- **FR-002**: System MUST read the file contents and send to Claude API for summarization
- **FR-003**: System MUST print the summary to stdout as plain text
- **FR-004**: System MUST print errors to stderr with nonzero exit code
- **FR-005**: System MUST require ANTHROPIC_API_KEY environment variable
- **FR-006**: System MUST reject empty files and files over 1MB

### Key Entities

- **SummarizeParams**: `{ file_path: string }` — input to the handler
- **SummarizeResult**: `{ summary, file_path, model, tokens_in, tokens_out }` — handler output

## Success Criteria

### Measurable Outcomes

- **SC-001**: `tldr <file>` produces a summary in under 10 seconds for files under 100KB
- **SC-002**: All error cases return structured errors (never throw)
- **SC-003**: 14 tests pass covering invariants and summarize handler
- **SC-004**: Type check passes with zero errors
