# Verification: 001-typescript-library-parses

### 1. `parse_partial` Silently Converts Overflow/Invalid Segments to Wildcards
- **Issue**: In `parse_range.ts`, `parse_seg` correctly returns `null` for numbers exceeding `Number.MAX_SAFE_INTEGER` or containing leading zeros (e.g., `03`). However, the validation loop in `parse_partial` only checks `!/^[0-9]+$/.test(segs[i])`. Because both `9007199254740992` and `03` pass the digit regex, the loop accepts them. `parse_partial` then treats the `null` return value as a wildcard. This causes bounds like `>=9007199254740992.0.0` to silently evaluate as `>=0.0.0`, and `=1.2.03` to evaluate as `=1.2.x`, completely bypassing bounds logic instead of throwing a parse error.
- **Severity**: Critical
- **Suggested Test**: 
  typescript
  expect(satisfies('0.5.0', '>=9007199254740992.0.0')).toBe(false);
  // currently returns true
  

### 2. Strict Whitespace Tokenization Breaks Standard Comparators
- **Issue**: `parse_comparator_set` relies on strictly splitting ranges by whitespace (`trimmed.split(/\s+/)`). This violently breaks any comparator that includes a standard space between the operator and version (e.g., `>= 1.2.3`). It splits it into two tokens: `">="` and `"1.2.3"`. `parse_primitive` chokes on the bare `">="` token, returning `null`, which causes the parser to reject the entire valid range. Npm semver semantics explicitly allow these spaces.
- **Severity**: Critical
- **Suggested Test**: 
  typescript
  expect(satisfies('1.5.0', '>= 1.2.3')).toBe(true);
  

### 3. Bare `^` and `~` Operators Parsed as `0.x` Instead of Errors
- **Issue**: According to US-011, `parse_range("^")` must return a clear error indicating a missing version. However, `expand_caret` and `expand_tilde` slice the first character and pass an empty string to `parse_partial`. `parse_partial("")` correctly parses this as a full wildcard. The caret/tilde logic then defaults the missing major version to `0`, causing bare `^` and `~` inputs to silently parse as `>=0.0.0 <1.0.0` instead of failing.
- **Severity**: High
- **Suggested Test**: 
  typescript
  expect(satisfies('0.5.0', '^')).toBe(false); 
  // or expect(parse_range('^').ok).toBe(false);
  

### 4. `parse_prerelease_id` Lacks Integer Precision Limits
- **Issue**: While `parse_core_segment` safely enforces `Number.MAX_SAFE_INTEGER` to prevent silent floating-point truncation, `parse_prerelease_id` parses numeric identifiers directly with `Number(s)`. This allows massive prerelease segments to parse "successfully" but lose precision in JavaScript memory, completely invalidating transitive comparison checks.
- **Severity**: High
- **Suggested Test**: 
  typescript
  expect(parse('1.0.0-9007199254740993').ok).toBe(false);
  

### 5. X-Range Expansion Discards Prerelease Identifiers
- **Issue**: When `expand_xrange` constructs boundaries for partial versions, it hardcodes the tuple with `sv(p.major, p.minor, 0)`. The `sv` helper defaults the prerelease array to empty. If an X-range naturally carries a prerelease constraint (e.g., `1.2-alpha`), the `['alpha']` prerelease array captured by `parse_partial` is completely discarded, altering the lower bound from `>=1.2.0-alpha` to an artificially higher `>=1.2.0`.
- **Severity**: Medium
- **Suggested Test**: 
  typescript
  expect(satisfies('1.2.0-beta', '1.2-alpha')).toBe(true);
  

### 6. Hyphen Ranges Fail When Combined in AND-Sets
- **Issue**: The hyphen range expansion logic (`expand_hyphen`) matches against the *entire* comparator set string using the greedy regex `/^(.+)\s+-\s+(.+)$/`. If a developer combines a hyphen range with another comparator via space-separation (e.g., `>1.0.0 2.0.0 - 3.0.0`), the regex captures `>1.0.0 2.0.0` as the left bound, causing a catastrophic parse failure. Hyphen ranges currently cannot be AND-ed with anything else.
- **Severity**: Medium
- **Suggested Test**: 
  typescript
  expect(satisfies('2.5.0', '>1.0.0 2.0.0 - 3.0.0')).toBe(true);
  

### 7. `satisfies` Cannot Be Invoked in Loose Mode
- **Issue**: The core `parse` function explicitly implements an `opts?: ParseOptions` parameter to tolerate missing segments and prefixes (`v1.2.3`). However, the public `satisfies` entry point signature strictly takes `(version, range)` with no option to pass arguments downward. This prevents the library from dynamically evaluating real-world git tags or non-strict strings via its primary testing method.
- **Severity**: Medium
- **Suggested Test**: 
  typescript
  expect(satisfies('v1.2.3', '1.x', { loose: true })).toBe(true);
