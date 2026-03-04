# Rule Taxonomy
Eight rules ship in v1, covering the highest-value structural and formatting checks.

## Implemented Rules (v1)

### Structural (error severity)
| Rule | Description |
|------|-------------|
| `no-heading-skip` | Heading levels must not skip (H1→H3 invalid) |
| `single-h1` | Only one H1 per document |
| `no-unclosed-fence` | Fenced code blocks must be closed |

### Formatting (warning severity)
| Rule | Description |
|------|-------------|
| `no-trailing-whitespace` | No trailing spaces (skips code blocks) |
| `no-hard-tabs` | No tab characters (skips code blocks) |
| `no-consecutive-blank-lines` | Max one consecutive blank line |
| `final-newline` | File must end with newline |

### Style (warning severity)
| Rule | Description |
|------|-------------|
| `fenced-code-language` | Fenced code blocks should specify language |

## Not Yet Implemented

From the original taxonomy, these remain for future work:

- **Semantic**: alt text on images, meaningful link text, duplicate headings
- **Style**: emphasis consistency, list marker consistency, heading style consistency
- **Structural**: link validity, list indentation consistency

## Severity Model

Three-tier model implemented: `error | warning | info`. Structural issues that break document meaning are errors; formatting and style issues are warnings. Info tier available but unused in v1.

## Code Block Awareness

Formatting rules that check raw lines (trailing whitespace, hard tabs) must skip lines inside code blocks. A shared `lines_in_code_blocks()` helper centralizes this logic.
