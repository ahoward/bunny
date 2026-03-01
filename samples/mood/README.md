# mood

> a simple API where team members post their daily mood (1-5) with an optional note. shows trends per person and per team over the last 30 days. no auth for the prototype. json API.

## built by bny

this project was built entirely by [bny](../../README.md) — from a one-paragraph seed to working code. no human wrote any application code.

**the seed:** [seed.md](seed.md)

## run the factory yourself

```bash
cd samples/mood
./dev/setup
../../bin/bny next --auto    # spin 1: core API
../../bin/bny next --auto    # spin 2: trends
../../bin/bny next --auto    # spin 3: validation
```

or use `bny spin` for fully autonomous runs in tmux.

## stack

- **runtime:** bun
- **language:** typescript
- **storage:** filesystem (json)
- **framework:** none — raw Bun.serve
