class WaitlistPromoter
  def call(event_id:)
    ActiveRecord::Base.transaction do
      event = Event.lock("FOR UPDATE").find(event_id)
      remaining = event.spots_remaining

      return if remaining <= 0

      waitlisted = event.rsvps.where(status: "waitlisted").order(:waitlist_position)

      waitlisted.each do |rsvp|
        break if event.spots_remaining <= 0

        if rsvp.party_size <= event.spots_remaining
          rsvp.update!(status: "accepted", waitlist_position: nil)
          event.update!(accepted_count: event.accepted_count + rsvp.party_size)
        end
        # Skip groups that don't fit — they retain position
      end

      # Recalculate waitlist positions
      event.rsvps.where(status: "waitlisted").order(:waitlist_position).each_with_index do |rsvp, idx|
        rsvp.update!(waitlist_position: idx + 1) if rsvp.waitlist_position != idx + 1
      end
    end
  end
end
