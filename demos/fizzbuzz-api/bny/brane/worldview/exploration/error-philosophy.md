# Error Philosophy
How a trivial API handles errors reveals its design maturity.

## The Spectrum

**Permissive**: Accept anything, coerce to integers, never fail
- `GET /fizzbuzz/3.7` → treats as 3
- `GET /fizzbuzz/abc` → 400 with helpful message

**Strict**: Reject anything that isn't a positive integer
- `GET /fizzbuzz/3.0` → 400 (not an integer)
- `GET /fizzbuzz/0` → 400 (not positive)

**Informative**: Always return structured error bodies
```json
{
  "error": "invalid_input",
  "message": "Expected positive integer, got '3.7'",
  "hint": "Use /fizzbuzz/3 or /fizzbuzz/4"
}
```

## Design Choice

For a demo API, **strict + informative** is probably best — it demonstrates proper API design without hiding mistakes behind coercion.
