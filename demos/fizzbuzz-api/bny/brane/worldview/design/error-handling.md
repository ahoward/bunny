# Error Handling
A fizzbuzz API has a deceptively narrow input domain — but edge cases still matter.

## Invalid Inputs
- Non-numeric: `GET /fizzbuzz/abc` → 400
- Negative numbers: `GET /fizzbuzz/-3` → 400 or valid? (FizzBuzz is traditionally 1..N)
- Zero: `GET /fizzbuzz/0` → 400 or valid?
- Floats: `GET /fizzbuzz/3.7` → 400 or truncate?
- Very large numbers: `GET /fizzbuzz/99999999999999999` → precision issues?

## Range Errors
- `from > to` → 400 with helpful message
- Range too large → 400 or paginate?
- Missing required params → 400

## Error Response Shape
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Expected a positive integer, got 'abc'",
    "param": "n"
  }
}
```

## HTTP Status Codes
- 200 — success
- 400 — bad input
- 404 — unknown route
- 500 — server error (should never happen for pure computation)

## Philosophy
FizzBuzz is pure computation — no database, no auth, no external deps. The only failure mode is bad input. This makes it an ideal case study for clean error design.
