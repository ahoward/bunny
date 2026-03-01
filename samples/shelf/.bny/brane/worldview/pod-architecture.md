# POD Architecture Principles

## Plain Old Data Only

All data structures are interfaces/types, never classes. Data flows through functions, not methods.

## Key Types

- **Bookmark**: Domain entity — id, url, title, tags, notes, created_at
- **Result<T>**: Envelope — status, result, errors, meta
- **ErrorMap**: Field-keyed error details
- **Handler**: Async function (params, emit?) → Result

## null Over undefined

Use null for explicit absence. Optional fields that are empty after trimming become null, not undefined. This survives JSON serialization and makes absence intentional.

## No Classes for Data

Classes tempt you toward inheritance, private state, and method coupling. POD + functions keeps data inert and logic composable. Store functions operate on Bookmark objects — they don't own them.

## Simplicity Rule

Three similar lines of code are better than one premature abstraction. The handler files are intentionally repetitive in structure — each follows the same guard-validate-execute-return pattern without a shared base class or middleware chain.
