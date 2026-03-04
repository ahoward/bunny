# Constitution

## Core Principles

### I. POD Only (Plain Old Data)
All data structures are Plain Old Data. No classes for data containers.
Types are interfaces or type aliases. Functions transform POD to POD.

### II. Antagonistic Testing
Tests are specifications. Claude designs, Gemini challenges, then implement.
Tests MUST exist before implementation. Tests lock after review.

### III. Unix-Clean
null over undefined. Exit codes matter. Streams and pipes where appropriate.

### IV. Simplicity (YAGNI)
Start simple. Three similar lines > one premature abstraction.
Complexity MUST be justified.

### V. The Strange Loop
The knowledge graph accumulates understanding. Each iteration enriches
the next. Guardrails bound each iteration. The loop is powerful because
it is constrained.

## Naming

| Thing | Style | Example |
|-------|-------|---------|
| Constants | SCREAMING_SNAKE | MAX_SIZE |
| Types | PascalCase | FileRecord |
| Variables/functions | snake_case | file_path |

## Workflow

1. Design interface
2. Design tests (Claude)
3. Review tests (Gemini)
4. Implement
5. Loop until green
6. If stuck — human checkpoint

Version: 1.0.0
