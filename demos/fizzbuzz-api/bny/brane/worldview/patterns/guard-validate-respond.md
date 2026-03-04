# Guard → Validate → Respond
A three-phase request handler pattern that keeps validation separate from business logic.

## Structure

1. **Guard** — check structural requirements (required params present?)
2. **Validate** — parse and verify each input (`parse_positive_int` returns `null` on failure)
3. **Respond** — call pure business logic, wrap in JSON

## Example

```typescript
function handle_range(url: URL): Response {
  // guard: structural check
  const from_str = url.searchParams.get("from");
  const to_str = url.searchParams.get("to");
  if (!from_str || !to_str) return error_response(...);

  // validate: parse + domain rules
  const from = parse_positive_int(from_str);
  if (from === null) return error_response(...);
  const to = parse_positive_int(to_str);
  if (to === null) return error_response(...);
  if (from > to) return error_response(...);
  if (to - from + 1 > MAX_RANGE) return error_response(...);

  // respond: pure logic
  const results = fizzbuzz_range(from, to);
  return json_response({ results, count: results.length });
}
```

## Why This Works

- Each early return has a specific, informative error (code + message + param)
- Business logic (`fizzbuzz_range`) never sees invalid input
- No exceptions for control flow — `null` return means "bad input"
- Flat structure — no nesting, easy to read top-to-bottom

## Validation Function Contract

`parse_positive_int(s: string): number | null`
- Returns `null` for any non-positive-integer input
- Uses regex `^\d+$` to reject floats, negatives, non-numeric
- Checks `Number.isSafeInteger()` to prevent precision issues
- Single responsibility: string → validated number, nothing else
