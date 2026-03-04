# Implementation Patterns
Reusable patterns that emerged from the first build cycle.

## Pure Core, Thin Shell

The architecture splits into two layers:
- **Pure function** (`count_text`): takes string, returns POD. No I/O, no side effects. Trivially testable.
- **Thin CLI shell** (`bin/wc-tool`): handles I/O (file reading, stdin, stdout/stderr), calls the pure core.

This pattern makes testing fast — unit tests cover logic without spawning processes, integration tests cover the CLI shell separately.

## CLI Test Harness

Pattern for testing CLI tools with Bun:

```typescript
async function run(args: string[], stdin?: string) {
  const proc = Bun.spawn(["bun", bin, ...args], {
    stdin: stdin !== undefined ? new Response(stdin).body : undefined,
    stdout: "pipe", stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}
```

Key details:
- `Bun.spawn` for subprocess control
- `new Response(stdin).body` to pipe stdin as a ReadableStream
- `new Response(proc.stdout).text()` to capture output
- Regex matching for output validation (robust to padding changes)

## Guard Early, Return POD

Functions check degenerate cases first and return immediately:

```typescript
if (characters === 0) return { lines: 0, words: 0, characters: 0 };
```

No exceptions for control flow. Errors surface via exit codes and stderr, not thrown exceptions.

## Fixture-Per-Behavior

Each test fixture isolates exactly one edge case:
- `empty.txt` — zero-length file
- `single-word.txt` — minimal non-empty case
- `no-trailing-newline.txt` — missing final newline
- `only-whitespace.txt` — whitespace without words
- `multi-line.txt` — the happy path

Fixtures are committed, not generated. Names describe the behavior being tested, not the content.
