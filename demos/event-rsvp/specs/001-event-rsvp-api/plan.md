# Implementation Plan: 001-event-rsvp-api

**Date**: 2026-03-10
**Spec**: specs/001-event-rsvp-api/spec.md

# Implementation Plan: Event RSVP API

## 1. Summary

Build a Rails 7 API-only application implementing RESTful endpoints for events and RSVPs with capacity limits, automatic waitlist promotion via background jobs, concurrency-safe reservation handling (SELECT FOR UPDATE), a 5-minute undo grace period for cancellations, and an audit trail for all state transitions.

**Technical approach:** PostgreSQL for pessimistic locking and CHECK constraints, Sidekiq for async waitlist promotion, AASM for state machine enforcement, cursor-based pagination via custom scopes. The `accepted_count` field tracks **headcount** (sum of party_size), not RSVP record count — addressing challenge #9 explicitly.

---

## 2. Technical Context

| Dimension | Choice |
|-----------|--------|
| Language | Ruby 3.2+ |
| Framework | Rails 7.1+ (API-only mode) |
| Database | PostgreSQL 15+ |
| Background jobs | Sidekiq + Redis |
| State machine | AASM gem |
| Testing | RSpec + FactoryBot + Shoulda Matchers |
| Concurrency testing | Thread-based integration specs |
| Auth | Simple token auth (header-based, `Authorization: Bearer <token>`) — no Devise, keep minimal |
| Serialization | Blueprinter or manual `as_json` — avoid heavy serializers |
| Ruby process manager | Foreman (Procfile) |

---

## 3. Project Structure

event-rsvp/
├── Gemfile
├── Procfile
├── config/
│   ├── application.rb          # API-only config
│   ├── database.yml            # PostgreSQL
│   ├── routes.rb               # All endpoint routing
│   ├── sidekiq.yml             # Sidekiq queues: default, promotions
│   └── initializers/
│       └── sidekiq.rb
├── app/
│   ├── controllers/
│   │   ├── application_controller.rb       # Auth, error handling, envelope helpers
│   │   ├── events_controller.rb            # CRUD for events
│   │   └── rsvps_controller.rb             # Create, cancel, undo, list
│   ├── models/
│   │   ├── user.rb
│   │   ├── event.rb                        # Capacity logic, registration window checks
│   │   ├── rsvp.rb                         # AASM state machine, scopes
│   │   └── rsvp_transition.rb              # Audit trail
│   ├── services/
│   │   ├── rsvp_creator.rb                 # Core RSVP creation with locking
│   │   ├── rsvp_canceller.rb               # Cancel + undo token generation
│   │   ├── rsvp_undoer.rb                  # Undo logic
│   │   └── waitlist_promoter.rb            # Promotion logic (called by job)
│   └── jobs/
│       ├── waitlist_promotion_job.rb        # Async promotion after grace period
│       └── undo_expiry_job.rb              # Triggers promotion when grace period ends
├── db/
│   ├── migrate/
│   │   ├── 001_create_users.rb
│   │   ├── 002_create_events.rb
│   │   ├── 003_create_rsvps.rb
│   │   └── 004_create_rsvp_transitions.rb
│   └── seeds.rb
├── spec/
│   ├── rails_helper.rb
│   ├── factories/
│   │   ├── users.rb
│   │   ├── events.rb
│   │   └── rsvps.rb
│   ├── models/
│   │   ├── event_spec.rb
│   │   ├── rsvp_spec.rb
│   │   └── rsvp_transition_spec.rb
│   ├── services/
│   │   ├── rsvp_creator_spec.rb
│   │   ├── rsvp_canceller_spec.rb
│   │   ├── rsvp_undoer_spec.rb
│   │   └── waitlist_promoter_spec.rb
│   ├── requests/
│   │   ├── events_spec.rb
│   │   ├── rsvps_spec.rb
│   │   └── rsvps_undo_spec.rb
│   └── integration/
│       └── concurrency_spec.rb             # Multi-threaded last-spot tests
├── dev/
│   ├── setup
│   ├── test
│   ├── health
│   ├── pre_flight
│   └── post_flight
└── bny/
    ├── decisions.md
    └── guardrails.json


---

## 4. Implementation Phases

### Phase 1: Rails App Scaffold & Database Schema

**Deliverables:** Bootable Rails API app, all migrations, database constraints, dev scripts wired.

**Steps:**

1. `rails new event-rsvp --api --database=postgresql --skip-javascript --skip-asset-pipeline` (inside current directory or restructure)
2. Add gems to `Gemfile`:
   ruby
   gem "aasm"
   gem "sidekiq"
   gem "redis"
   
   group :development, :test do
     gem "rspec-rails"
     gem "factory_bot_rails"
     gem "shoulda-matchers"
     gem "faker"
   end
   
3. `rails generate rspec:install`
4. Create migrations:

**`001_create_users.rb`**
ruby
create_table :users do |t|
  t.string :name, null: false
  t.string :email, null: false
  t.string :auth_token, null: false
  t.timestamps
end
add_index :users, :email, unique: true
add_index :users, :auth_token, unique: true


**`002_create_events.rb`**
ruby
create_table :events do |t|
  t.string :title, null: false
  t.text :description
  t.string :location
  t.datetime :start_time, null: false
  t.datetime :end_time, null: false
  t.string :time_zone, null: false  # IANA identifier
  t.integer :capacity, null: false
  t.datetime :registration_opens_at
  t.datetime :registration_closes_at
  t.string :attendee_visibility, null: false, default: "organizer_only"
  t.integer :accepted_count, null: false, default: 0  # HEADCOUNT, not record count
  t.references :organizer, null: false, foreign_key: { to_table: :users }
  t.timestamps
end
add_check_constraint :events, "capacity > 0", name: "events_capacity_positive"
add_check_constraint :events, "end_time > start_time", name: "events_end_after_start"
add_check_constraint :events, "accepted_count >= 0", name: "events_accepted_count_non_negative"
add_check_constraint :events, "accepted_count <= capacity", name: "events_accepted_within_capacity"
add_check_constraint :events, "attendee_visibility IN ('organizer_only','attendees_only','count_only','public')", name: "events_valid_visibility"


**`003_create_rsvps.rb`**
ruby
create_table :rsvps do |t|
  t.references :event, null: false, foreign_key: true
  t.references :user, null: false, foreign_key: true
  t.string :status, null: false
  t.integer :waitlist_position  # null when not waitlisted
  t.integer :party_size, null: false, default: 1
  t.string :undo_token
  t.datetime :undo_expires_at
  t.timestamps
end
add_index :rsvps, [:user_id, :event_id], unique: true
add_index :rsvps, [:event_id, :status]
add_index :rsvps, [:event_id, :waitlist_position]
add_check_constraint :rsvps, "party_size >= 1", name: "rsvps_party_size_positive"
add_check_constraint :rsvps, "status IN ('pending','accepted','waitlisted','declined','promoted','expired','no_show')", name: "rsvps_valid_status"


**`004_create_rsvp_transitions.rb`**
ruby
create_table :rsvp_transitions do |t|
  t.references :rsvp, null: false, foreign_key: true
  t.string :from_status
  t.string :to_status, null: false
  t.string :actor_type, null: false  # user, system, organizer
  t.integer :actor_id
  t.string :reason
  t.datetime :created_at, null: false
end
add_index :rsvp_transitions, [:rsvp_id, :created_at]


5. Run `rails db:create db:migrate`
6. Update `dev/test` to run `bundle exec rspec`
7. Update `dev/setup` to run `bundle install && rails db:setup && git config core.hooksPath .githooks`

---

### Phase 2: Models & State Machine

**Deliverables:** All models with validations, AASM state machine on RSVP, audit trail logging.

**`app/models/user.rb`**
ruby
class User < ApplicationRecord
  has_many :rsvps, dependent: :restrict_with_error
  has_many :organized_events, class_name: "Event", foreign_key: :organizer_id
  validates :name, :email, :auth_token, presence: true
  validates :email, uniqueness: true
end


**`app/models/event.rb`**
ruby
class Event < ApplicationRecord
  belongs_to :organizer, class_name: "User"
  has_many :rsvps, dependent: :restrict_with_error
  
  validates :title, :start_time, :end_time, :time_zone, :capacity, presence: true
  validates :capacity, numericality: { greater_than: 0 }
  validate :end_time_after_start_time
  
  def registration_open?(at: Time.current)
    opens = registration_opens_at || created_at
    closes = registration_closes_at || start_time
    at >= opens && at < closes
  end
  
  def spots_remaining
    [capacity - accepted_count, 0].max
  end
  
  def full?
    accepted_count >= capacity
  end
end


**`app/models/rsvp.rb`** — AASM state machine with transition guards and audit trail callbacks:
ruby
class Rsvp < ApplicationRecord
  include AASM
  belongs_to :event
  belongs_to :user
  has_many :rsvp_transitions, dependent: :destroy
  
  validates :party_size, numericality: { greater_than_or_equal_to: 1 }
  validates :user_id, uniqueness: { scope: :event_id }
  
  aasm column: :status, whiny_transitions: true do
    state :pending, initial: true
    state :accepted, :waitlisted, :declined, :promoted, :expired, :no_show
    
    event :accept do
      transitions from: [:pending, :promoted], to: :accepted
    end
    event :waitlist do
      transitions from: :pending, to: :waitlisted
    end
    event :decline do
      transitions from: [:accepted, :waitlisted, :promoted], to: :declined
    end
    event :promote do
      transitions from: :waitlisted, to: [:promoted, :accepted]
    end
    event :expire do
      transitions from: :promoted, to: :expired
    end
    event :mark_no_show do
      transitions from: :accepted, to: :no_show
    end
  end
  
  after_save :log_transition, if: :saved_change_to_status?
end


**`app/models/rsvp_transition.rb`**
ruby
class RsvpTransition < ApplicationRecord
  belongs_to :rsvp
  validates :to_status, :actor_type, presence: true
end


---

### Phase 3: Core Services (RSVP Creation with Locking)

**Deliverables:** `RsvpCreator`, `RsvpCanceller`, `RsvpUndoer`, `WaitlistPromoter` — all with specs.

**`app/services/rsvp_creator.rb`** — the critical concurrency-safe path:
ruby
class RsvpCreator
  Result = Data.define(:rsvp, :status, :created)
  
  def call(event_id:, user_id:, party_size: 1)
    # Check for existing RSVP first (idempotency)
    existing = Rsvp.find_by(event_id: event_id, user_id: user_id)
    return Result.new(rsvp: existing, status: :ok, created: false) if existing
    
    ActiveRecord::Base.transaction do
      event = Event.lock("FOR UPDATE").find(event_id)
      
      # Validate registration window
      # Validate party_size <= event.capacity
      
      status = if event.accepted_count + party_size <= event.capacity
                 :accepted
               else
                 :waitlisted
               end
      
      rsvp = Rsvp.new(event: event, user_id: user_id, party_size: party_size, status: status)
      
      if status == :accepted
        event.update!(accepted_count: event.accepted_count + party_size)
      else
        max_pos = event.rsvps.where(status: :waitlisted).maximum(:waitlist_position) || 0
        rsvp.waitlist_position = max_pos + 1
      end
      
      rsvp.save!
      Result.new(rsvp: rsvp, status: :created, created: true)
    end
  end
end


**`app/services/rsvp_canceller.rb`:**
- For accepted RSVPs: set `undo_token` (SecureRandom.urlsafe_base64), `undo_expires_at` (5 minutes), schedule `UndoExpiryJob.set(wait: 5.minutes).perform_later(rsvp.id)`
- For waitlisted RSVPs: transition to declined immediately, recalculate positions
- Database status stays `accepted` during grace period (per spec)

**`app/services/rsvp_undoer.rb`:**
- Validate token matches + `Time.current < undo_expires_at`
- Clear undo_token/undo_expires_at, cancel the scheduled expiry job
- Return 410 if expired

**`app/services/waitlist_promoter.rb`:**
- Called by `UndoExpiryJob` after grace period, or directly for waitlisted cancellations
- Inside transaction: lock event FOR UPDATE, find first waitlisted RSVP where `party_size <= spots_remaining` (ordered by `waitlist_position`), transition to accepted, increment `accepted_count` by `party_size`, recalculate positions
- Skip groups that don't fit (party_size > spots_remaining), promote next eligible (addresses challenge #1 — skipped parties retain position, promoted next time enough capacity opens)
- Idempotent: checks current status before promoting (addresses NFR-003)

---

### Phase 4: Background Jobs

**Deliverables:** `UndoExpiryJob`, `WaitlistPromotionJob`

**`app/jobs/undo_expiry_job.rb`:**
ruby
class UndoExpiryJob < ApplicationJob
  queue_as :promotions
  
  def perform(rsvp_id)
    rsvp = Rsvp.find(rsvp_id)
    return unless rsvp.status == "accepted" && rsvp.undo_token.present?
    return if rsvp.undo_expires_at && Time.current < rsvp.undo_expires_at
    
    ActiveRecord::Base.transaction do
      event = rsvp.event.lock!
      rsvp.update!(status: "declined", undo_token: nil, undo_expires_at: nil)
      event.update!(accepted_count: event.accepted_count - rsvp.party_size)
    end
    
    WaitlistPromotionJob.perform_later(rsvp.event_id)
  end
end


**`app/jobs/waitlist_promotion_job.rb`:**
ruby
class WaitlistPromotionJob < ApplicationJob
  queue_as :promotions
  
  def perform(event_id)
    WaitlistPromoter.new.call(event_id: event_id)
  end
end


---

### Phase 5: Controllers & Routing

**Deliverables:** All endpoints from the API summary, consistent envelope responses, error handling.

**`config/routes.rb`:**
ruby
Rails.application.routes.draw do
  resources :events, only: [:create, :index, :show, :update, :destroy] do
    resources :rsvps, only: [:create, :index], controller: "rsvps"
  end
  resources :rsvps, only: [:destroy] do
    member do
      post :undo
    end
  end
end


**`app/controllers/application_controller.rb`:**
- `authenticate!` — find user by `Authorization: Bearer <token>` header
- `render_resource(name, object, meta: {}, status: :ok)` — envelope helper
- `render_error(code:, message:, details: {}, status:)` — error envelope helper
- `rescue_from ActiveRecord::RecordNotFound` → 404
- `rescue_from AASM::InvalidTransition` → 422 with `invalid_transition` code

**`app/controllers/events_controller.rb`:**
- `create` — requires auth, builds event with `organizer: current_user`
- `index` — public, cursor-based pagination (keyset on `[created_at, id]`)
- `show` — public, includes `my_rsvp` if authenticated
- `update` — organizer only; if capacity increased, trigger `WaitlistPromotionJob`; if reduced below accepted_count, return 409 with explanation (per US-011)
- `destroy` — organizer only, soft-cancel (transition all RSVPs to declined)

**`app/controllers/rsvps_controller.rb`:**
- `create` — delegates to `RsvpCreator`, returns 201 (new) or 200 (existing/idempotent)
- `index` — visibility check based on `event.attendee_visibility` and caller role
- `destroy` — delegates to `RsvpCanceller`
- `undo` — delegates to `RsvpUndoer`

**Response envelope format:**
ruby
# Single resource
{ rsvp: { id: 42, status: "waitlisted", ... }, meta: { message: "..." } }

# Collection
{ events: [...], meta: { count: 60 }, links: { next: "?cursor=..." } }

# Error
{ error: { code: "registration_closed", message: "...", details: { ... } } }


---

### Phase 6: Request Specs & Integration Tests

**Deliverables:** Full request spec coverage for all user scenarios, concurrency test.

**`spec/requests/events_spec.rb`:**
- US-001: create with valid attrs → 201, missing fields → 422, invalid time range → 422
- US-008: paginated listing, cursor navigation
- US-009: show with RSVP status included
- US-011: capacity increase triggers promotion, decrease below accepted → 409

**`spec/requests/rsvps_spec.rb`:**
- US-002: RSVP under capacity → 201/accepted, with party_size
- US-003: RSVP at capacity → 201/waitlisted with position
- US-004: cancel accepted → 200 with undo_token, cancel waitlisted → recalc positions
- US-005: promotion after grace period, party_size skip
- US-010: visibility enforcement (403 for organizer_only)
- US-012: organizer filtered RSVP list
- US-013: duplicate RSVP → 200 with existing (idempotency)
- US-014: registration window enforcement
- US-015: invalid state transitions → 422
- E-009: party_size 0 → 400
- E-010: party_size > capacity → 422
- E-012: status field in body ignored
- E-013: unauthenticated → 401
- E-014: nonexistent event → 404

**`spec/requests/rsvps_undo_spec.rb`:**
- US-006: undo within window → restored, undo after window → 410

**`spec/integration/concurrency_spec.rb`:**
- US-007 / SC-001: spawn N threads, each creating an RSVP for the same event with 1 remaining slot. Assert exactly 1 accepted, N-1 waitlisted. `accepted_count` never exceeds capacity.

---

### Phase 7: Challenge Resolutions

Address each challenge from `challenge.md` with explicit design decisions:

| Challenge | Resolution | Where |
|-----------|-----------|-------|
| #1 Waitlist starvation (party size skip) | Skipped groups retain their `waitlist_position`. On each promotion pass, iterate by position, promote first that fits. Groups are re-evaluated every time capacity opens. | `WaitlistPromoter` |
| #2 Promoted state & confirmation flow | **Phase 1 scope: auto-promote only** (waitlisted → accepted directly). The `promoted` state and confirmation endpoint (`POST /rsvps/:id/confirm`) are P3 — documented but not implemented in this phase. | `config/routes.rb` comment, spec doc |
| #3 RSVP party_size update | Not supported in Phase 1. User must cancel and re-RSVP. Document in API error response: "To change party size, cancel and create a new RSVP." | `RsvpsController#update` → 405 |
| #4 Idempotency with changed payload | Return existing RSVP as-is (200). If `party_size` differs, include `meta.message: "Existing RSVP returned. Party size differs from request."` Do not silently update. | `RsvpCreator` |
| #5 Capacity reduction eviction | Phase 1: reject with 409 + explanation (per US-011). Phase 2: implement LIFO eviction with organizer confirmation endpoint. | `EventsController#update` |
| #6 Waitlisted cancel + undo | Undo restores original `waitlist_position`. Positions recalculated on cancel, re-inserted on undo. | `RsvpCanceller`, `RsvpUndoer` |
| #7 Promotion vs. undo race | Undo strictly checks `undo_expires_at` timestamp. If expired, undo fails (410) regardless of whether promotion job has run yet. The job is the authority after expiry. | `RsvpUndoer` |
| #8 Event deletion orphaned RSVPs | `DELETE /events/:id` soft-cancels: sets a `cancelled_at` timestamp, transitions all non-declined RSVPs to declined with reason `event_cancelled`, does NOT hard-delete. | `EventsController#destroy` |
| #9 Headcount vs. record count | `accepted_count` is **headcount** (sum of party_size). Incremented/decremented by `party_size`, not by 1. Column comment documents this. | Migration, `RsvpCreator`, `RsvpCanceller` |

---

## 5. Dependencies & Execution Order

Phase 1: Scaffold & Schema
  ↓
Phase 2: Models & State Machine    (depends on: schema)
  ↓
Phase 3: Core Services             (depends on: models)
  ↓                    ╲
Phase 4: Background Jobs            Phase 5: Controllers
  (depends on: services)             (depends on: services)
  ↓                    ╱
Phase 6: Request & Integration Specs (depends on: controllers + jobs)
  ↓
Phase 7: Challenge Resolutions       (woven into phases 3-6, verified here)


**Parallel opportunities:**
- Phase 4 (jobs) and Phase 5 (controllers) can be developed in parallel after Phase 3
- Model specs (Phase 2) and service specs (Phase 3) can be written alongside implementation
- Factory definitions can be created during Phase 2 and reused throughout

**Critical path:** Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 6

**Estimated file count:** ~30 files (within typical PR blast radius for a greenfield feature)
