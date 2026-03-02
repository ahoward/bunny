# Implementation Plan: Harden brane file ops

**Branch**: `001-harden-brane-file` | **Date**: 2026-03-02 | **Spec**: `specs/001-harden-brane-file/spec.md`

## Summary

Three focused hardening fixes from code review: path traversal guard on LLM-generated file paths, fd leak fix in TTY confirmation, and parseInt validation for CLI args.

## Technical Context

**Language**: TypeScript (Bun)
**Files to modify**: `bny/lib/brane.ts`, `bny/next.ts`, `bin/bny.ts`
**Testing**: `bun test`

## Changes

### 1. Path traversal guard — `bny/lib/brane.ts`

Add a `validate_path()` helper that checks `relative(wv_dir, resolved)` doesn't start with `..`. Call it from both `apply_operations()` and `preview_operations()`. On violation: log to stderr and skip the operation (don't throw — we want to process the other operations).

### 2. fd leak fix — `bny/lib/brane.ts` and `bny/next.ts`

Wrap the `/dev/tty` open/read/close in `confirm_intake()` and `next.ts confirm()` with try/finally. Import `openSync`, `readSync`, `closeSync` statically instead of using `require()`.

### 3. parseInt validation — `bin/bny.ts`

After each `parseInt`/`parseFloat` call in `parse_args()`, check for `isNaN()`. On invalid value, write error to stderr and set `process.exitCode = 1`.
