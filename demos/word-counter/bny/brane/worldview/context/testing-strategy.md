# Testing Strategy
Two-layer testing — fast unit tests for logic, subprocess integration tests for CLI behavior.

## Test Architecture

**Layer 1: Unit tests** for `count_text()` — 8 cases covering:
- Empty input (zero baseline)
- Single word with newline
- Multiple lines (happy path)
- No trailing newline (line count edge case)
- Whitespace-only content (zero words)
- Multiple spaces between words (regex correctness)
- Tab characters as separators
- UTF-8 multi-byte characters (byte counting)

**Layer 2: Integration tests** for CLI — 5 cases covering:
- Single file processing
- Multiple files with total line
- stdin piping
- Missing file error handling
- Empty file processing

## Fixture Design

Fixtures are committed, minimal, and named by behavior:
- `empty.txt` — 0 bytes
- `single-word.txt` — `hello\n` (6 bytes)
- `multi-line.txt` — two lines, 44 bytes
- `no-trailing-newline.txt` — `hello world` (11 bytes, no newline)
- `only-whitespace.txt` — `\n` (1 byte)

## Validation Approach

Unit tests use `toEqual` with exact POD values. CLI tests use regex patterns (`/^\s*2\s+9\s+44\s+/`) to validate output format without being brittle to padding.

## Property-Based Invariants (Not Yet Implemented)

These hold for all inputs and could be added:
- `characters >= words` (always)
- `lines <= characters` (always)
- `words >= 0` (always)
- Concatenation: counts approximately sum

## Antagonistic Review

Tests are written first, reviewed by a second model for blind spots, then locked. Implementation comes after. This prevents implementation from biasing test design.
