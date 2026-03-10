# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_10_000004) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "events", force: :cascade do |t|
    t.integer "accepted_count", default: 0, null: false
    t.string "attendee_visibility", default: "organizer_only", null: false
    t.datetime "cancelled_at"
    t.integer "capacity", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.datetime "end_time", null: false
    t.string "location"
    t.bigint "organizer_id", null: false
    t.datetime "registration_closes_at"
    t.datetime "registration_opens_at"
    t.datetime "start_time", null: false
    t.string "time_zone", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["organizer_id"], name: "index_events_on_organizer_id"
    t.check_constraint "accepted_count >= 0", name: "events_accepted_count_non_negative"
    t.check_constraint "attendee_visibility::text = ANY (ARRAY['organizer_only'::character varying, 'attendees_only'::character varying, 'count_only'::character varying, 'public'::character varying]::text[])", name: "events_valid_visibility"
    t.check_constraint "capacity > 0", name: "events_capacity_positive"
    t.check_constraint "end_time > start_time", name: "events_end_after_start"
  end

  create_table "rsvp_transitions", force: :cascade do |t|
    t.integer "actor_id"
    t.string "actor_type", null: false
    t.datetime "created_at", null: false
    t.string "from_status"
    t.string "reason"
    t.bigint "rsvp_id", null: false
    t.string "to_status", null: false
    t.index ["rsvp_id", "created_at"], name: "index_rsvp_transitions_on_rsvp_id_and_created_at"
    t.index ["rsvp_id"], name: "index_rsvp_transitions_on_rsvp_id"
  end

  create_table "rsvps", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "event_id", null: false
    t.integer "party_size", default: 1, null: false
    t.string "status", null: false
    t.datetime "undo_expires_at"
    t.string "undo_token"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.integer "waitlist_position"
    t.index ["event_id", "status"], name: "index_rsvps_on_event_id_and_status"
    t.index ["event_id", "waitlist_position"], name: "index_rsvps_on_event_id_and_waitlist_position"
    t.index ["event_id"], name: "index_rsvps_on_event_id"
    t.index ["user_id", "event_id"], name: "index_rsvps_on_user_id_and_event_id", unique: true
    t.index ["user_id"], name: "index_rsvps_on_user_id"
    t.check_constraint "party_size >= 1", name: "rsvps_party_size_positive"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'waitlisted'::character varying, 'declined'::character varying, 'promoted'::character varying, 'expired'::character varying, 'no_show'::character varying]::text[])", name: "rsvps_valid_status"
  end

  create_table "users", force: :cascade do |t|
    t.string "auth_token", null: false
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["auth_token"], name: "index_users_on_auth_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "events", "users", column: "organizer_id"
  add_foreign_key "rsvp_transitions", "rsvps"
  add_foreign_key "rsvps", "events"
  add_foreign_key "rsvps", "users"
end
