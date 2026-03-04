# Plan: CLI Tool Counts

## Architecture

```
src/
  lib/
    counter.ts      # pure counting functions (count_words, count_lines, count_chars, count_all)
    types.ts        # CountResult type
  cli.ts            # argument parsing, file reading, output formatting
bin/
  wc.ts             # entry point — imports and runs cli
tests/
  counter.test.ts   # unit tests for counting functions
  cli.test.ts       # integration tests for CLI behavior
```

## Steps

1. Scaffold project (package.json, tsconfig.json)
2. Define types (CountResult POD interface)
3. Write tests for counter functions
4. Write tests for CLI
5. Implement counter functions
6. Implement CLI
7. Wire up bin/wc.ts entry point
8. Configure dev/test
9. Run tests, iterate until green
