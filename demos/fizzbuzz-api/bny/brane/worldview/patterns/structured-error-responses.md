# Structured Error Responses
Every error returns a consistent JSON envelope with machine-readable code, human-readable message, and optional parameter attribution.

## Shape

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Expected a positive integer, got 'abc'",
    "param": "n"
  }
}
```

## Error Codes Used

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_INPUT` | 400 | Input failed validation |
| `RANGE_TOO_LARGE` | 400 | Range exceeds max (1000) |
| `NOT_FOUND` | 404 | Unknown route |

## Design Decisions

- **`param` is optional** — present when the error is attributable to a specific input field
- **`code` is SCREAMING_SNAKE** — machine-parseable, stable across message rewording
- **`message` is human-readable** — includes the offending value for debuggability
- **Helper function** `error_response(code, message, status, param?)` enforces consistency
- **Errors nest under `error` key** — distinguishable from success responses at the top level
