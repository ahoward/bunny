# Beyond Classic FizzBuzz
Generalizing the fizzbuzz concept opens surprisingly rich design space.

## Generalized FizzBuzz

Allow clients to define their own rules:
```json
{
  "number": 30,
  "rules": [
    {"divisor": 3, "word": "fizz"},
    {"divisor": 5, "word": "buzz"},
    {"divisor": 7, "word": "woof"}
  ]
}
```

This turns a toy API into a configurable rule engine.

## Interesting Tensions

- **Simplicity vs generality** — the seed says "serves fizzbuzz, nothing more" but generalization is natural
- **Purity vs features** — adding custom rules means input validation gets complex
- **API surface area** — one endpoint or many?

## What FizzBuzz Actually Teaches

As a demo project, the real lessons are:
1. How to structure a REST API cleanly
2. Input validation and error handling patterns
3. Testing strategies for pure functions exposed over HTTP
4. Documentation and developer experience

The algorithm is the excuse; the infrastructure is the point.
