# Guard Early Validation

All validation happens at the top of the handler, before any I/O or business logic.

## Pattern

```typescript
async function handler(params, emit?) {
  // 1. Validate structure
  if (!params || typeof params !== "object") return error({ ... })
  
  // 2. Validate required fields
  const { file_path } = params as Record<string, unknown>
  if (!file_path) return error({ file_path: [required("file_path")] })
  
  // 3. Validate types
  if (typeof file_path !== "string" || !file_path.trim())
    return error({ file_path: [invalid("file_path", "must be non-empty string")] })
  
  // 4. Validate preconditions (file exists, size limits, env vars)
  if (!existsSync(resolved)) return error({ ... })
  if (stat.size > MAX_FILE_SIZE) return error({ ... })
  if (!api_key) return error({ ... })
  
  // 5. Business logic (only reached if all guards pass)
  const response = await client.messages.create({ ... })
  return success({ ... })
}
```

## Benefits

- Each guard returns a structured error Result (not an exception)
- Errors are specific: which field, what code, what message
- Business logic section is clean — guaranteed valid inputs
- Each guard is independently testable

## Ordering

Cheapest checks first: type checks → existence checks → size checks → env var checks → I/O.

## Mutual Exclusion Guards

When a handler accepts multiple alternative inputs (e.g., file_path OR url OR content), add a mutual exclusion guard after individual field validation:

```typescript
const sources = [file_path, url, content].filter(Boolean)
if (sources.length === 0) return error({ input: [required("input")] })
if (sources.length > 1) return error({ input: [invalid("input", "provide exactly one")] })
```

This sits between field-level guards and precondition checks in the ordering. See [Multi-Source Input](multi-source-input.md) for the full pattern.
