# Performance Considerations
For files under 1MB (the common case), simplicity beats optimization.

## Current Approach: Read-All-At-Once

The implementation reads entire file content via `Bun.file(path).text()` and processes it in memory. This is the simplest correct approach.

## Why Not Streaming

Streaming with fixed-size buffers complicates word counting — words can span chunk boundaries. The complexity isn't justified until files exceed available memory.

## Byte Counting via Buffer.byteLength

`Buffer.byteLength(content)` counts UTF-8 bytes without materializing a second copy. This matches `wc -c` and is O(n) but with low constant factor.

## Line Counting via Manual Loop

A simple `for` loop checking `content[i] === '\n'` avoids creating intermediate arrays (which `split('\n')` would do). For large files, this matters.

## Bun Startup Advantage

Bun's ~20ms startup makes this viable as a pipeline tool. Node's 50-80ms startup would be noticeable in tight loops.

## When to Optimize

If files >100MB become a use case:
1. Switch to streaming reads with chunk-boundary word detection
2. Consider `Bun.file().stream()` with fixed-size chunks
3. Line and byte counting can stream trivially; word counting needs a state machine
