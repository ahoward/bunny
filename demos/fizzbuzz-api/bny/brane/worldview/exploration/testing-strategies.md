# Testing Strategies
FizzBuzz has deterministic output, making it an excellent test-design case study.

## Property-Based Testing

FizzBuzz has clear mathematical properties:
- Every multiple of 15 → "fizzbuzz"
- Every multiple of 3 (not 15) → "fizz"
- Every multiple of 5 (not 15) → "buzz"
- Everything else → the number as a string

These are ideal for property-based testing (fast-check, hypothesis).

## Boundary Cases

- Zero: is it valid input?
- Negative numbers: fizzbuzz of -15?
- Very large numbers: Number.MAX_SAFE_INTEGER
- Non-integers: 3.5, NaN, Infinity

## API-Level Tests

- Content negotiation
- Malformed requests (strings, arrays, objects as input)
- Range edge cases (from === to, range of 1 million)
- Concurrent requests

## The Meta-Question

FizzBuzz is the canonical interview problem. Building a *tested, production-grade API* around it inverts the exercise — the algorithm is trivial, the engineering around it is the real work.
