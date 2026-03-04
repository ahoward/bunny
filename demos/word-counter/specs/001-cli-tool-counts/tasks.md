# Tasks: 001-cli-tool-counts

## Setup

- [x] Initialize project (package.json, tsconfig.json)
- [x] Configure dev/test to run bun test
- [x] Create test fixtures directory

## Core

- [x] Create test fixtures (empty, single-word, multi-line, unicode, no-trailing-newline)
- [x] Write tests for count_text(content) → { words, lines, characters }
- [x] Implement src/count_text.ts
- [x] Write tests for CLI (file args, stdin, multiple files, missing file)
- [x] Implement bin/wc-tool CLI entry point
- [x] Verify all tests pass via ./dev/test
