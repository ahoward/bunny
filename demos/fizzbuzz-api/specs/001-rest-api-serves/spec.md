# Spec: REST API Serves FizzBuzz

## Summary
A stateless HTTP API that computes fizzbuzz for single numbers and ranges.

## Endpoints

### GET /fizzbuzz/:n
Returns the fizzbuzz result for a single positive integer.

**Response 200:**
```json
{"number": 15, "result": "fizzbuzz"}
```

**Response 400:** invalid input (non-integer, negative, zero, float)
```json
{"error": {"code": "INVALID_INPUT", "message": "Expected a positive integer", "param": "n"}}
```

### GET /fizzbuzz?from=1&to=100
Returns fizzbuzz results for a range of integers.

**Response 200:**
```json
{"results": [{"number": 1, "result": "1"}, {"number": 3, "result": "fizz"}], "count": 100}
```

**Constraints:**
- `from` and `to` must be positive integers
- `from <= to`
- max range size: 1000

### GET /health
Returns `{"status": "ok"}` with 200.

### Unknown routes
Return 404: `{"error": {"code": "NOT_FOUND", "message": "Route not found"}}`

## Rules
- Classic fizzbuzz: divisible by 3 → "fizz", by 5 → "buzz", by 15 → "fizzbuzz"
- Non-matching numbers return the number as a string
- All responses are `application/json`
- No external dependencies beyond Bun stdlib

## Tech
- Bun + TypeScript
- Raw `Bun.serve()` — no framework
- No database, no state
