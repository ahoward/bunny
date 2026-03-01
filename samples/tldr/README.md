# tldr

> a command line tool that takes a file path or URL and prints a concise summary. uses the claude API. pipe-friendly — works with stdin. caches results so the same file doesn't cost twice.

## built by bny

this project was built entirely by [bny](../../README.md) — from a one-paragraph seed to working code. no human wrote any application code.

**the seed:** [seed.md](seed.md)

## run the factory yourself

```bash
cd samples/tldr
./dev/setup
../../bin/bny next --auto    # spin 1: core summarizer
../../bin/bny next --auto    # spin 2: URL + stdin
../../bin/bny next --auto    # spin 3: caching
```

or use `bny spin` for fully autonomous runs in tmux.

## stack

- **runtime:** bun
- **language:** typescript
- **ai:** claude API via @anthropic-ai/sdk
- **framework:** none — pure CLI
