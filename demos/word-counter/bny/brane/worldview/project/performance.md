# Performance
Counting is I/O-bound until it isn't — and the boundary matters.

## Scaling Characteristics
- Small files (<1MB): any approach works, startup time dominates
- Medium files (1-100MB): streaming mandatory, allocation matters
- Large files (>1GB): memory-mapped I/O, parallel counting, chunk boundaries

## The Chunk Boundary Problem
If you split a file into chunks for parallel processing, a word or line might span the boundary. Solutions:
- Overlap chunks and deduplicate
- Post-process boundaries after parallel counting
- Accept single-threaded for correctness simplicity

## Bun-Specific Considerations
- Bun's file I/O is fast but JS string handling has overhead
- `Bun.file().text()` loads everything — fine for small files, dangerous for large
- `Buffer` operations vs string operations: different performance profiles
- Native `wc` will always be faster for pure counting — speed isn't the value proposition
