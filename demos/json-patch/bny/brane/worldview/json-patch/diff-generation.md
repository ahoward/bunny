# Diff Generation (RFC 6902 Inverse)
Generating a patch from two documents is the inverse problem — not covered by RFC 6902 but essential in practice.

## Why It Matters

If you can diff `before` and `after` into a patch, you get:
- Change tracking / audit logs
- Undo/redo stacks
- Conflict detection in collaborative editing
- Compact deltas for network sync

## Algorithms

### Naive: Replace Everything
For every leaf that differs, emit a `replace`. Simple but verbose — doesn't capture structural moves.

### LCS-Based Array Diffing
Use longest-common-subsequence to diff arrays, emitting minimal add/remove operations. Expensive for large arrays.

### Move Detection
If an object disappears from one path and an identical object appears at another, emit a `move` instead of `remove` + `add`. Requires heuristics — how identical is identical?

## Out of Scope?

Diff generation might be out of scope for this library's initial version, but designing the core with diffing in mind (e.g., exposing pointer resolution utilities) keeps the door open.
