# samples

three projects built entirely by bny — from a one-paragraph seed to working code.

no human wrote any application code. each project got 3 spins of `bny next --auto`.

| sample | seed | what it builds |
|--------|------|---------------|
| [mood](mood/) | team mood tracker | JSON API — post moods, view trends |
| [tldr](tldr/) | file/URL summarizer | CLI tool — pipe-friendly, cached |
| [shelf](shelf/) | personal bookmarks | JSON API — tags, search, markdown export |

## how it works

each sample is a standalone bny project with:

```
samples/mood/
  seed.md          ← the idea (one paragraph)
  .bny/            ← project state (roadmap, guardrails, decisions)
  bny/ → ../../bny ← shared dark factory tools (symlink)
  dev/             ← validation scripts
  src/             ← built by bny
  tests/           ← built by bny
  specs/           ← built by bny
```

## run it yourself

```bash
cd samples/mood
./dev/setup

# three spins of the factory
bun bin/bny next --auto
bun bin/bny next --auto
bun bin/bny next --auto
```

each spin: specify → plan → tasks → review → implement → ruminate.

the factory learns from each spin. check `.bny/brane/worldview/` to see what it learned.

## what to look for

1. **seed.md** — the one-paragraph idea that started everything
2. **specs/** — the specs, plans, and task lists bny generated
3. **src/** — the code bny wrote
4. **tests/** — the tests bny designed (reviewed by gemini)
5. **.bny/decisions.md** — every decision the factory made
6. **.bny/brane/worldview/** — what the factory learned along the way
