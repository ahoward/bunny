class CreateEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :events do |t|
      t.string :title, null: false
      t.text :description
      t.string :location
      t.datetime :start_time, null: false
      t.datetime :end_time, null: false
      t.string :time_zone, null: false
      t.integer :capacity, null: false
      t.datetime :registration_opens_at
      t.datetime :registration_closes_at
      t.string :attendee_visibility, null: false, default: "organizer_only"
      t.integer :accepted_count, null: false, default: 0
      t.references :organizer, null: false, foreign_key: { to_table: :users }
      t.datetime :cancelled_at
      t.timestamps
    end
    add_check_constraint :events, "capacity > 0", name: "events_capacity_positive"
    add_check_constraint :events, "end_time > start_time", name: "events_end_after_start"
    add_check_constraint :events, "accepted_count >= 0", name: "events_accepted_count_non_negative"
    add_check_constraint :events, "attendee_visibility IN ('organizer_only','attendees_only','count_only','public')", name: "events_valid_visibility"
  end
end
