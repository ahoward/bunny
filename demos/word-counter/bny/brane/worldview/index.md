# Knowledge Base Index
Project knowledge organized by topic: design decisions, implementation patterns, and context.

## Project

- [Overview](worldview/project/overview.md) — Word Counter CLI: a Unix-style tool for counting words, lines, and characters
- [Scope Questions](worldview/project/scope-questions.md) — Key decisions: stdin support, multiple files, flags, encoding

## Design

- [Unix Philosophy](worldview/design/unix-philosophy.md) — Composability via wc-compatibility; clone first, extend later
- [Output Format](worldview/design/output-format.md) — wc-compatible 8-char padded columns; exit codes; partial output on failure
- [Edge Cases](worldview/design/edge-cases.md) — Resolved: bytes not chars, newline counting, whitespace-split words

## Implementation

- [Patterns](worldview/implementation/patterns.md) — Pure core / thin shell, CLI test harness, fixture-per-behavior

## Context

- [Performance](worldview/context/performance.md) — Read-all-at-once is correct for now; streaming deferred until needed
- [Testing Strategy](worldview/context/testing-strategy.md) — Two-layer testing, committed fixtures, antagonistic review

## Lenses

- [all](lenses/all.md) — Broad absorption lens for concepts, relationships, and insights

## Sources

- `sources/2026-03-04T23-02-03-479Z-seed-md.txt` — Initial project seed document
