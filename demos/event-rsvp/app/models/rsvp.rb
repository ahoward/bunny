class Rsvp < ApplicationRecord
  include AASM

  belongs_to :event
  belongs_to :user
  has_many :rsvp_transitions, dependent: :destroy

  validates :party_size, numericality: { greater_than_or_equal_to: 1 }
  validates :user_id, uniqueness: { scope: :event_id }

  aasm column: :status, whiny_transitions: true do
    state :pending, initial: true
    state :accepted
    state :waitlisted
    state :declined
    state :promoted
    state :expired
    state :no_show

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
      transitions from: :waitlisted, to: :accepted
    end

    event :expire_promotion do
      transitions from: :promoted, to: :expired
    end

    event :mark_no_show do
      transitions from: :accepted, to: :no_show
    end
  end

  after_save :log_transition, if: :saved_change_to_status?

  private

  def log_transition
    previous_status = saved_change_to_status[0]
    rsvp_transitions.create!(
      from_status: previous_status,
      to_status: status,
      actor_type: "system",
      reason: "state_change"
    )
  end
end
