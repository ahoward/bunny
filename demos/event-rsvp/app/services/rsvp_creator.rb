class RsvpCreator
  Result = Struct.new(:rsvp, :http_status, :error, keyword_init: true)

  def call(event_id:, user_id:, party_size: 1)
    # Validate party_size
    if party_size < 1
      return Result.new(error: { code: "invalid_party_size", message: "Party size must be at least 1" }, http_status: :bad_request)
    end

    # Idempotency: check for existing RSVP
    existing = Rsvp.find_by(event_id: event_id, user_id: user_id)
    return Result.new(rsvp: existing, http_status: :ok) if existing

    ActiveRecord::Base.transaction do
      event = Event.lock("FOR UPDATE").find(event_id)

      # Validate not cancelled
      if event.cancelled?
        return Result.new(error: { code: "event_cancelled", message: "Event has been cancelled" }, http_status: :unprocessable_entity)
      end

      # Validate registration window
      unless event.registration_open?
        if event.registration_closes_at && Time.current.to_i >= event.registration_closes_at.to_i
          return Result.new(
            error: { code: "registration_closed", message: "Registration is closed", details: { closed_at: event.registration_closes_at } },
            http_status: :unprocessable_entity
          )
        else
          return Result.new(
            error: { code: "registration_not_open", message: "Registration is not yet open", details: { registration_opens_at: event.registration_opens_at } },
            http_status: :unprocessable_entity
          )
        end
      end

      # Validate party_size doesn't exceed capacity
      if party_size > event.capacity
        return Result.new(
          error: { code: "party_size_exceeds_capacity", message: "Party size exceeds event capacity" },
          http_status: :unprocessable_entity
        )
      end

      status = if event.accepted_count + party_size <= event.capacity
                 "accepted"
               else
                 "waitlisted"
               end

      rsvp = Rsvp.new(event: event, user_id: user_id, party_size: party_size, status: status)

      if status == "accepted"
        event.update!(accepted_count: event.accepted_count + party_size)
      else
        max_pos = event.rsvps.where(status: "waitlisted").maximum(:waitlist_position) || 0
        rsvp.waitlist_position = max_pos + 1
      end

      rsvp.save!
      Result.new(rsvp: rsvp, http_status: :created)
    end
  rescue ActiveRecord::RecordNotUnique
    # Concurrent duplicate — return existing
    existing = Rsvp.find_by(event_id: event_id, user_id: user_id)
    Result.new(rsvp: existing, http_status: :ok)
  end
end
