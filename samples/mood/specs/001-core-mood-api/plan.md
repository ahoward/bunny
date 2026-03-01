# Implementation Plan: Core mood API

**Branch**: `001-core-mood-api` | **Date**: 2026-03-01 | **Spec**: specs/001-core-mood-api/spec.md

## Summary

JSON API for posting daily moods (1-5) per team member, listing entries, and viewing 30-day trends. No auth, filesystem storage, raw Bun.serve. Follows bunny app.call + Result envelope pattern.

## Technical Context

**Language/Version**: TypeScript on Bun
**Primary Dependencies**: None (bun built-ins only)
**Storage**: Filesystem JSON (`data/moods.json`)
**Testing**: bun:test
**Target Platform**: Local / any Bun-capable server
**Project Type**: Single project

## Project Structure

```text
src/
├── app.ts              # Handler registry (app.call)
├── index.ts            # Entry point — registers all handlers
├── server.ts           # Bun.serve HTTP layer
├── handlers/
│   ├── ping.ts         # Health ping
│   ├── health.ts       # Deep health check
│   ├── create_mood.ts  # POST /moods
│   ├── list_moods.ts   # GET /moods
│   └── trends.ts       # GET /trends
└── lib/
    ├── types.ts        # POD types (Result, MoodEntry, etc.)
    ├── result.ts       # Result envelope helpers
    ├── log.ts          # Structured JSON logging
    └── store.ts        # Filesystem JSON store

tests/
├── invariants.test.ts      # All-paths structural tests
└── handlers/
    ├── create_mood.test.ts  # Mood creation tests
    ├── list_moods.test.ts   # Mood listing tests
    └── trends.test.ts       # Trends tests
```
