# shelf

> save URLs with tags and notes. search by tag or full text across your saved items. export your collection as a markdown document. single user, sqlite storage, json API.

## built by bny

this project was built entirely by [bny](../../README.md) — from a one-paragraph seed to working code. no human wrote any application code.

**the seed:** [seed.md](seed.md)

## run the factory yourself

```bash
cd samples/shelf
./dev/setup
../../bin/bny next --auto    # spin 1: core bookmark API
../../bin/bny next --auto    # spin 2: search + filtering
../../bin/bny next --auto    # spin 3: markdown export
```

or use `bny spin` for fully autonomous runs in tmux.

## stack

- **runtime:** bun
- **language:** typescript
- **storage:** sqlite (bun:sqlite built-in)
- **framework:** none — raw Bun.serve
