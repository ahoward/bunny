# Spec: REST API Serves FizzBuzz

## Summary

A minimal REST API that serves fizzbuzz over HTTP using Bun.

## Endpoints

### GET /fizzbuzz/:number

Returns the fizzbuzz result for a single positive integer.

**Success (200):**
```json
{ "input": 15, "result": "fizzbuzz" }
```

**Invalid input (400):**
```json
{ "error": "invalid_input", "message": "Expected positive integer, got '3.7'" }
```

### GET /fizzbuzz?from=1&to=100

Returns fizzbuzz results for a range of positive integers.

**Success (200):**
```json
{ "from": 1, "to": 5, "results": [
  { "input": 1, "result": "1" },
  { "input": 2, "result": "2" },
  { "input": 3, "result": "fizz" },
  { "input": 4, "result": "4" },
  { "input": 5, "result": "buzz" }
]}
```

**Invalid range (400):**
```json
{ "error": "invalid_input", "message": "from must be <= to" }
```

**Range too large (400):**
```json
{ "error": "invalid_input", "message": "Range too large (max 1000)" }
```

### GET /health

Returns `{ "status": "ok" }`.

## Rules

- Multiples of 15 → "fizzbuzz"
- Multiples of 3 (not 15) → "fizz"
- Multiples of 5 (not 15) → "buzz"
- Everything else → the number as a string

## Constraints

- Strict input validation: reject non-positive-integers
- JSON responses only
- No dependencies beyond Bun built-ins
- Stateless, pure computation
