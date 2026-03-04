# Endpoint Patterns
Different URL structures trade off between REST purity, discoverability, and client ergonomics.

## Single Value
- `GET /fizzbuzz/15` — path parameter, clean and cacheable
- `GET /fizzbuzz?n=15` — query parameter, flexible

## Range / Batch
- `GET /fizzbuzz?from=1&to=100` — classic range
- `POST /fizzbuzz` with body `{"numbers": [3, 5, 15, 97]}` — arbitrary batch
- `GET /fizzbuzz/1..100` — range-in-path (unconventional but expressive)

## Pagination
For large ranges, unbounded responses are dangerous. Options:
- Limit max range size (e.g., 1000) and return 400 beyond that
- Stream with `Transfer-Encoding: chunked`
- Return paginated results with `Link` headers

## Content Negotiation
- `Accept: application/json` — structured output
- `Accept: text/plain` — one result per line, pipe-friendly
- `Accept: text/csv` — spreadsheet-ready

## Considerations
- Path params (`/fizzbuzz/15`) are more cacheable at the CDN/proxy layer
- Query params are more flexible for optional arguments (custom divisors?)
- POST for batch avoids URL length limits but sacrifices cacheability
