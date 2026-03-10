class UndoExpiryJob < ApplicationJob
  queue_as :promotions

  def perform(rsvp_id)
    rsvp = Rsvp.find(rsvp_id)

    # If undo was used (token cleared), skip
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
