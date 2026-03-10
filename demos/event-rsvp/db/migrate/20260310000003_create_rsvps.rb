class CreateRsvps < ActiveRecord::Migration[8.1]
  def change
    create_table :rsvps do |t|
      t.references :event, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :status, null: false
      t.integer :waitlist_position
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
  end
end
