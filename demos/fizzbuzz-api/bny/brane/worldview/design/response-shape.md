# Response Shape
The JSON envelope design determines how easy the API is to consume, extend, and debug.

## Minimal
```json
{"result": "fizzbuzz"}
```

## Rich
```json
{
  "number": 15,
  "result": "fizzbuzz",
  "divisors": {"3": true, "5": true}
}
```

## Batch
```json
{
  "results": [
    {"number": 1, "result": "1"},
    {"number": 3, "result": "fizz"},
    {"number": 5, "result": "buzz"},
    {"number": 15, "result": "fizzbuzz"}
  ],
  "count": 4
}
```

## Open Questions
- Should the number echo back as a string or integer?
- Should non-fizzbuzz numbers return the number as a string (`"7"`) or as an integer (`7`)?
- Include metadata (request timing, API version) in the envelope?
- Use a consistent Result wrapper (`{ok, data, error}`) for all responses?
