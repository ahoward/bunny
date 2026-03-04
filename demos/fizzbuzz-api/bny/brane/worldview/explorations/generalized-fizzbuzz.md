# Generalized FizzBuzz
The classic 3/5 rule is arbitrary — a configurable API opens interesting design territory.

## Custom Rules
What if the client can define their own divisor-word mappings?

```
GET /fizzbuzz/15?rules=3:fizz,5:buzz
GET /fizzbuzz/15?rules=2:even,7:lucky
POST /fizzbuzz {"n": 15, "rules": {"3": "fizz", "5": "buzz", "7": "wham"}}
```

## Design Tensions
- Configurability vs simplicity — most users just want classic fizzbuzz
- Default rules (`3:fizz, 5:buzz`) should work with zero config
- Custom rules add combinatorial complexity: what if two custom words collide on the same number?

## Rule Ordering
With custom rules, order matters. `15` with rules `{3: fizz, 5: buzz}` → `fizzbuzz`. But what's the concatenation order? Ascending divisor? Insertion order? Alphabetical?

## This Challenges the Assumption
The current worldview treats fizzbuzz as a fixed algorithm. Making it configurable turns the API from a toy into a genuinely useful abstraction — a number-classification service.
