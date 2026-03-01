# Implementation Plan: Core summarizer

**Branch**: `004-core-summarizer` | **Date**: 2026-03-01 | **Spec**: `specs/004-core-summarizer/spec.md`

## Summary

Build the core summarizer: a CLI tool that reads a file, sends its contents to Claude API, and prints a concise summary. Uses the app.call / Result envelope pattern from bunny.

## Technical Context

**Language/Version**: TypeScript / Bun
**Primary Dependencies**: `@anthropic-ai/sdk` (Claude API client)
**Storage**: N/A (no caching in this feature)
**Testing**: `bun:test` with mocked Anthropic SDK
**Target Platform**: macOS / Linux CLI
**Project Type**: Single project
**Constraints**: Files capped at 1MB, responses capped at 1024 tokens

## Constitution Check

- POD only: all data in/out is plain objects
- Guard early: all validation at handler top
- snake_case: all identifiers
- null over undefined: explicit in all Result envelopes
- Tests first: invariant + summarize tests written and passing

## Project Structure

### Source Code

```text
src/
├── app.ts                    # app.call interface
├── index.ts                  # handler registration
├── lib/
│   ├── types.ts              # Result, Params, Handler types
│   ├── result.ts             # success/error helpers
│   └── log.ts                # structured stderr logging
└── handlers/
    ├── ping.ts               # health check
    └── summarize.ts          # core summarizer

tests/
├── invariants.test.ts        # framework invariant tests
├── summarize.test.ts         # summarize handler tests
└── fixtures/
    └── summarize/
        ├── input.json
        ├── expected.json
        └── sample.txt

bin/
└── tldr                      # CLI entry point
```
