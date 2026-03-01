# Validation Patterns

## Guard Early, Accumulate All

Handlers validate at the function top and accumulate all errors before returning. Never fail on the first error — report every problem simultaneously.

```typescript
const errors: ErrorMap = {}
if (!url) errors.url = required("url")
if (bad_tags) errors.tags = invalid("tags", "must be array")
if (Object.keys(errors).length > 0) return error(errors)
```

## ErrorMap Structure

Errors keyed by field name: `{ field: { code, message, meta? } }`. This makes client-side form binding trivial — each field maps to its error.

## Whitespace Normalization

- Trim all string inputs on arrival
- Whitespace-only optional fields become null (explicit absence)
- Tags array: trim each element, filter out empty strings after trim
- Required fields: reject empty/whitespace-only strings

## Result Helpers

`required(field)` and `invalid(field, reason)` produce consistent ErrorDetail objects. Keep the vocabulary small — most validation needs only these two.
