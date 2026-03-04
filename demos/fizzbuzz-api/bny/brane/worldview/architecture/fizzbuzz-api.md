# FizzBuzz API
A REST API that serves fizzbuzz over HTTP.

## Overview

The core concept is exposing the classic fizzbuzz algorithm as an HTTP service — turning a simple programming exercise into a networked resource.

## Key Characteristics

- **Protocol**: REST over HTTP
- **Domain**: FizzBuzz computation
- **Pattern**: Stateless request/response — client sends a number (or range), server returns fizzbuzz results

## Design Considerations

- Endpoint structure (e.g., `GET /fizzbuzz/:n` or `GET /fizzbuzz?from=1&to=100`)
- Response format (JSON)
- Error handling for invalid inputs
- Potential for batch operations (ranges vs single values)
