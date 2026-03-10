class RsvpTransition < ApplicationRecord
  belongs_to :rsvp

  validates :to_status, presence: true
  validates :actor_type, presence: true
end
