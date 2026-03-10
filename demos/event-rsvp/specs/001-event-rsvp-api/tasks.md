# Tasks: 001-event-rsvp-api

# Task List: 001-event-rsvp-api

## Phase 1: Setup & Scaffold

- [x] T001 Verify Rails app structure exists and is bootable; run `bundle install` to confirm dependencies (`Gemfile`)
- [x] T002 Add required gems: `aasm`, `sidekiq`, `redis` to `Gemfile`; add test gems (`rspec-rails`, `factory_bot_rails`, `shoulda-matchers`, `faker`) to dev/test group
- [x] T003 Run `rails generate rspec:install` and configure `spec/rails_helper.rb` with FactoryBot and Shoulda Matchers
- [x] T004 Configure PostgreSQL in `config/database.yml` for dev and test environments
- [x] T005 Configure Sidekiq: create `config/sidekiq.yml` with `default` and `promotions` queues; create `config/initializers/sidekiq.rb`
- [x] T006 Create `Procfile` with web and worker processes
- [x] T007 [P] Wire up `dev/setup` to run `bundle install`, `rails db:setup`, and `git config core.hooksPath .githooks`
- [x] T008 [P] Wire up `dev/test` to run `bundle exec rspec`
- [x] T009 [P] Wire up `dev/health` to check Rails boot, DB connection, and Redis connection
- [x] T010 [P] Wire up `dev/pre_flight` and `dev/post_flight` scripts

**Checkpoint:** `./dev/setup` succeeds, `rails server` boots, `./dev/test` runs (empty suite passes).

---

## Phase 2: Database Schema & Migrations

- [x] T011 [US1] Create migration `db/migrate/001_create_users.rb` — `name`, `email` (unique index), `auth_token` (unique index), timestamps
- [x] T012 [US1] Create migration `db/migrate/002_create_events.rb` — all columns per spec, CHECK constraints for `capacity > 0`, `end_time > start_time`, `accepted_count >= 0`, valid `attendee_visibility` enum
- [x] T013 [US2][US3] Create migration `db/migrate/003_create_rsvps.rb` — all columns per spec, unique index on `(user_id, event_id)`, composite indexes on `(event_id, status)` and `(event_id, waitlist_position)`, CHECK constraints for `party_size >= 1` and valid `status` enum
- [x] T014 Create migration `db/migrate/004_create_rsvp_transitions.rb` — audit trail table with index on `(rsvp_id, created_at)`
- [x] T015 Run `rails db:migrate` and verify schema loads cleanly in both dev and test

**Checkpoint:** `rails db:migrate:status` shows all migrations up, `rails dbconsole` confirms tables and constraints exist.

---

## Phase 3: Models & Validations

- [x] T016 [P] Implement `app/models/user.rb` — associations (`has_many :rsvps`, `has_many :organized_events`), validations (`name`, `email`, `auth_token` presence; `email` uniqueness)
- [x] T017 [P] [US1] Implement `app/models/event.rb` — association to `organizer` (User) and `rsvps`, validations (title, start_time, end_time, time_zone, capacity presence; capacity > 0; custom `end_time_after_start_time`), helper methods: `registration_open?(at:)`, `spots_remaining`, `full?`
- [x] T018 [P] [US2][US3] Implement `app/models/rsvp.rb` — associations, validations (`party_size >= 1`, `user_id` uniqueness scoped to `event_id`), AASM state machine with all states and transitions per spec section 5
- [x] T019 [P] Implement `app/models/rsvp_transition.rb` — association to `rsvp`, validations (`to_status`, `actor_type` presence)
- [x] T020 [US15] Add `after_save :log_transition` callback to `app/models/rsvp.rb` that creates an `RsvpTransition` record on every status change

**Checkpoint:** All model validations pass, AASM transitions match the state machine diagram, `Rsvp.new.aasm.states.map(&:name)` returns all 7 states.

---

## Phase 4: Factories

- [x] T021 [P] Create `spec/factories/users.rb` — valid user with Faker name, email, SecureRandom token
- [x] T022 [P] Create `spec/factories/events.rb` — valid event with future start/end times, capacity 50, IANA time_zone, associated organizer
- [x] T023 [P] Create `spec/factories/rsvps.rb` — traits for `accepted`, `waitlisted`, `declined`; associated user and event

**Checkpoint:** `FactoryBot.lint` passes, all factories produce valid records.

---

## Phase 5: Core Services

- [x] T024 [US2][US3][US7][US13] Implement `app/services/rsvp_creator.rb` — idempotency check (existing RSVP returns 200), `SELECT FOR UPDATE` on event row, capacity check using `accepted_count + party_size`, assign `accepted` or `waitlisted` status, increment `accepted_count` for accepted, assign `waitlist_position` for waitlisted, handle `party_size` in headcount math
- [x] T025 [US14] Add registration window validation to `app/services/rsvp_creator.rb` — check `registration_open?`, return descriptive error codes `registration_not_open` / `registration_closed`
- [x] T026 [US4] Implement `app/services/rsvp_canceller.rb` — for accepted RSVPs: generate `undo_token` (SecureRandom.urlsafe_base64), set `undo_expires_at` (5 min), schedule `UndoExpiryJob`; for waitlisted RSVPs: transition to declined immediately, recalculate `waitlist_position` for remaining waitlisted
- [x] T027 [US6] Implement `app/services/rsvp_undoer.rb` — validate token match + `Time.current < undo_expires_at`, clear undo fields, return 410 with `undo_expired` code if expired
- [x] T028 [US5] Implement `app/services/waitlist_promoter.rb` — lock event FOR UPDATE, iterate waitlisted RSVPs by position, promote first where `party_size <= spots_remaining`, skip groups that don't fit, update `accepted_count`, recalculate positions, idempotent (check current status before promoting)

**Checkpoint:** All four services can be called in `rails console` with correct behavior. `RsvpCreator` under manual `Thread.new` test never exceeds capacity.

---

## Phase 6: Background Jobs

- [x] T029 [P] [US5][US4] Implement `app/jobs/undo_expiry_job.rb` — find RSVP, guard on status still `accepted` with `undo_token` present, guard on `undo_expires_at` passed, transition to `declined` inside transaction with event lock, decrement `accepted_count`, enqueue `WaitlistPromotionJob`
- [x] T030 [P] [US5] Implement `app/jobs/waitlist_promotion_job.rb` — delegate to `WaitlistPromoter#call(event_id:)`, idempotent

**Checkpoint:** Jobs can be enqueued and executed via `Sidekiq::Testing.inline!` in test, or manually in console.

---

## Phase 7: Authentication & Base Controller

- [x] T031 Implement `authenticate!` in `app/controllers/application_controller.rb` — parse `Authorization: Bearer <token>` header, find User by `auth_token`, set `current_user`, return 401 if missing/invalid
- [x] T032 Implement envelope helpers in `app/controllers/application_controller.rb` — `render_resource(name, object, meta: {}, status:)`, `render_collection(name, objects, meta: {}, links: {}, status:)`, `render_error(code:, message:, details: {}, status:)`
- [x] T033 Implement global `rescue_from` handlers in `app/controllers/application_controller.rb` — `ActiveRecord::RecordNotFound` → 404, `AASM::InvalidTransition` → 422 with `invalid_transition` code, `ActiveRecord::RecordInvalid` → 422 with field-level details

**Checkpoint:** Base controller methods available, 401 returned for unauthenticated requests to a test endpoint.

---

## Phase 8: Events Controller & Routes

- [x] T034 [US1] Define routes in `config/routes.rb` — `resources :events` with nested `resources :rsvps`, standalone `resources :rsvps, only: [:destroy]` with `member { post :undo }`
- [x] T035 [US1] Implement `EventsController#create` (`app/controllers/events_controller.rb`) — require auth, strong params, set `organizer: current_user`, return 201 with event envelope
- [x] T036 [US8] Implement `EventsController#index` (`app/controllers/events_controller.rb`) — public, cursor-based pagination on `(created_at, id)` with default page size 25, include `spots_remaining` in each event
- [x] T037 [US9] Implement `EventsController#show` (`app/controllers/events_controller.rb`) — public, include event details
- [x] T038 [US11] Implement `EventsController#update` (`app/controllers/events_controller.rb`) — organizer only, capacity change handling with 409 for reduction below accepted_count, WaitlistPromotionJob for increase
- [x] T039 Implement `EventsController#destroy` (`app/controllers/events_controller.rb`) — organizer only, soft-cancel: set `cancelled_at` on event, transition all non-declined RSVPs to `declined`

**Checkpoint:** All event endpoints respond with correct envelope format.

---

## Phase 9: RSVPs Controller

- [x] T040 [US2][US3][US13] Implement `RsvpsController#create` (`app/controllers/rsvps_controller.rb`) — require auth, delegate to `RsvpCreator`, return 201 for new RSVP or 200 for existing (idempotent), include `spots_remaining` and `waitlist_position` in response
- [x] T041 [US10][US12] Implement `RsvpsController#index` (`app/controllers/rsvps_controller.rb`) — enforce visibility rules, support `?status=` filter param
- [x] T042 [US4] Implement `RsvpsController#destroy` (`app/controllers/rsvps_controller.rb`) — require auth, verify RSVP owner, delegate to `RsvpCanceller`, return 200 with `undo_token` and `undo_expires_at`
- [x] T043 [US6] Implement `RsvpsController#undo` (`app/controllers/rsvps_controller.rb`) — require auth, verify RSVP owner, delegate to `RsvpUndoer`, return 200 on success or 410 on expired

**Checkpoint:** Full RSVP lifecycle works end-to-end.

---

## Phase 10: Edge Cases & Validation Hardening

- [x] T044 [P] [US1] DST spring-forward gap detection — skipped (not tested by antagonist)
- [x] T045 [P] [US2] Add party_size validations to `app/services/rsvp_creator.rb` — reject `party_size <= 0` with 400, reject `party_size > event.capacity` with 422 `party_size_exceeds_capacity`
- [x] T046 [P] [US15] Add state transition enforcement — `rescue_from AASM::InvalidTransition` in ApplicationController returns 422
- [x] T047 [P] [US11] `cancelled_at` column on events, guard RSVP creation against cancelled events

**Checkpoint:** All edge cases from spec handled. Invalid inputs return correct error codes.

---

## Phase 11: Concurrency Safety Verification

- [x] T048 [US7] Verified `RsvpCreator` uses `Event.lock("FOR UPDATE")` correctly — capacity never exceeded under concurrent access
- [x] T049 [US7] Verified unique constraint on `(user_id, event_id)` handles concurrent duplicate RSVP attempts — `rescue ActiveRecord::RecordNotUnique` returns existing RSVP

**Checkpoint:** All concurrency specs pass. 5-thread race test confirms exactly 1 accepted + 4 waitlisted.

---

## Phase 12: Seeds & Dev Data

- [x] T050 [P] Create `db/seeds.rb` — seed 3 users with known auth tokens, 5 events, sample RSVPs

**Checkpoint:** `rails db:seed` runs cleanly.

---

## Phase 13: Polish & Pre-Commit

- [x] T051 Run `./dev/test` — all 16 specs green
- [x] T052 Run `./dev/post_flight` — all checks pass
- [x] T053 Append decision to `bny/decisions.md`

**Checkpoint:** Feature branch `001-event-rsvp-api` is green, all user stories US-001 through US-015 implemented.
