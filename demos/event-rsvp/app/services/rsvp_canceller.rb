class RsvpCanceller
  Result = Struct.new(:rsvp, :undo_token, :undo_expires_at, :error, keyword_init: true)

  def call(rsvp:)
    if rsvp.status == "accepted"
      cancel_accepted(rsvp)
    elsif rsvp.status == "waitlisted"
      cancel_waitlisted(rsvp)
    else
      Result.new(error: { code: "invalid_transition", message: "Cannot cancel RSVP with status #{rsvp.status}" })
    end
  end

  private

  def cancel_accepted(rsvp)
    token = SecureRandom.urlsafe_base64(32)
    expires_at = 5.minutes.from_now

    ActiveRecord::Base.transaction do
      rsvp.update!(undo_token: token, undo_expires_at: expires_at)
      # Status stays accepted during grace period — the job handles the transition
    end

    UndoExpiryJob.set(wait: 5.minutes).perform_later(rsvp.id)

    Result.new(rsvp: rsvp, undo_token: token, undo_expires_at: expires_at)
  end

  def cancel_waitlisted(rsvp)
    ActiveRecord::Base.transaction do
      event = rsvp.event.lock!
      old_position = rsvp.waitlist_position
      rsvp.update!(status: "declined", waitlist_position: nil)

      # Recalculate positions for users behind this one
      if old_position
        event.rsvps.where(status: "waitlisted").where("waitlist_position > ?", old_position).order(:waitlist_position).each_with_index do |r, idx|
          r.update!(waitlist_position: old_position + idx)
        end
      end
    end

    Result.new(rsvp: rsvp)
  end
end
