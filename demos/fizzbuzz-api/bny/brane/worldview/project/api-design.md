# API Design
REST endpoint structure and response format choices for serving fizzbuzz.

## Endpoint Options

### Single number
```
GET /fizzbuzz/15 → { "input": 15, "result": "fizzbuzz" }
```

### Range
```
GET /fizzbuzz?from=1&to=100 → { "results": [{"input": 1, "result": "1"}, ...] }
```

### Parameterized (custom divisors)
```
POST /fizzbuzz { "number": 15, "rules": {3: "fizz", 5: "buzz"} }
```

## Response Format Considerations

- JSON as primary content type
- Support `Accept: text/plain` for simple output?
- Array responses for ranges — streaming vs buffered
- Pagination for large ranges

## Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 400  | Invalid input (negative, non-integer, range too large) |
| 422  | Semantically invalid (from > to) |

## Open Questions

- Should the API accept arbitrary divisor/word pairs (generalized fizzbuzz)?
- What's the max range size before we need pagination or streaming?
- Should results include the original number alongside the fizzbuzz string?
