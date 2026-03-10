class User < ApplicationRecord
  has_many :rsvps, dependent: :restrict_with_error
  has_many :organized_events, class_name: "Event", foreign_key: :organizer_id, dependent: :restrict_with_error

  validates :name, presence: true
  validates :email, presence: true, uniqueness: true
  validates :auth_token, presence: true

  before_validation :generate_auth_token, on: :create

  private

  def generate_auth_token
    self.auth_token ||= SecureRandom.urlsafe_base64(32)
  end
end
