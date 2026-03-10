class Event < ApplicationRecord
  belongs_to :organizer, class_name: "User"
  has_many :rsvps, dependent: :restrict_with_error

  validates :title, presence: true
  validates :start_time, presence: true
  validates :end_time, presence: true
  validates :time_zone, presence: true
  validates :capacity, presence: true, numericality: { greater_than: 0 }
  validate :end_time_after_start_time

  def registration_open?(at: Time.current)
    opens = registration_opens_at || created_at
    closes = registration_closes_at || start_time
    at >= opens && at.to_i < closes.to_i
  end

  def spots_remaining
    [capacity - accepted_count, 0].max
  end

  def full?
    accepted_count >= capacity
  end

  def cancelled?
    cancelled_at.present?
  end

  private

  def end_time_after_start_time
    return unless start_time.present? && end_time.present?
    if end_time <= start_time
      errors.add(:end_time, "must be after start_time")
    end
  end
end
