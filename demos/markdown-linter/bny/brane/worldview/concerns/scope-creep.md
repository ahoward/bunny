# Scope Creep Risks
A markdown linter sounds simple but the problem space is surprisingly deep.

## The Slippery Slope

1. Start: lint `.md` files for formatting
2. Then: support GFM tables, task lists
3. Then: support MDX, JSX-in-markdown
4. Then: support frontmatter validation
5. Then: prose quality (grammar, readability)
6. Then: link checking (HTTP HEAD requests, slow)
7. Then: cross-document consistency (all docs use same heading style)
8. Then: LSP server for real-time editing
9. Then: you've built a platform

## Where to Draw the Line

The MVP should answer: **what is the smallest useful thing?**

Proposal: Start with structural and whitespace rules only. No network I/O (link checking), no prose analysis (Vale's domain), no editor integration (phase 2).

## The 'Just One More Rule' Problem

Each rule seems small. But each rule needs:
- Implementation
- Tests (antagonistic!)
- Configuration options
- Documentation
- Edge case handling

10 rules × 5 concerns = 50 units of work. Scope discipline matters.
