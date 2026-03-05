# Core API Endpoints and Data Model

Generated: 2026-03-05
Topic: "--yes waitlist API design"
Effort: M

## Rationale

The worldview has thorough API surface design (api-surface.md) and data model sketches (data-model-sketch.md), but no implementation exists. Without the core signup → position → promotion loop working end-to-end, referral mechanics, webhooks, and analytics have nothing to attach to. The scaling-pressure-points.md file warns that position calculation and concurrent writes are the first bottlenecks — getting the data layer right from the start avoids painful rewrites. The privacy-and-compliance.md file also mandates DELETE and GET endpoints for GDPR, which should be built into the first pass rather than retrofitted.

## Worldview References

- technical/api-surface.md
- technical/data-model-sketch.md
- technical/scaling-pressure-points.md
- product/privacy-and-compliance.md

## Summary

Implement the foundational CRUD endpoints (create waitlist, add entry, check position, promote) backed by a Postgres-ready data model with derived queue position. This is the MVP skeleton that every other feature depends on.

## Implementation Sketch

- Define Waitlist and Entry schemas with score-based position ranking, email uniqueness per waitlist, and anti-gaming fields (ip_hash, email_verified)
- Implement POST /waitlists/:id/entries with referral_code generation, optional referred_by linking, and normalized email handling
- Implement GET /waitlists/:id/entries/:id/position as a rank query with index optimization for the score+waitlist_id pattern
- Implement POST /waitlists/:id/promote to batch-promote top N entries by score, updating status and promoted_at
- Implement DELETE /waitlists/:id/entries/:id for cancellation and GDPR erasure
- Add Event logging for signup/promotion/cancellation to support future webhook delivery
