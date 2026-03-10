class CreateRsvpTransitions < ActiveRecord::Migration[8.1]
  def change
    create_table :rsvp_transitions do |t|
      t.references :rsvp, null: false, foreign_key: true
      t.string :from_status
      t.string :to_status, null: false
      t.string :actor_type, null: false
      t.integer :actor_id
      t.string :reason
      t.datetime :created_at, null: false
    end
    add_index :rsvp_transitions, [:rsvp_id, :created_at]
  end
end
