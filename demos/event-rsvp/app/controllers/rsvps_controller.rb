class RsvpsController < ApplicationController
  def create
    event = Event.find(params[:event_id])
    party_size = (params[:party_size] || 1).to_i

    if party_size < 1
      return render_error(code: "invalid_party_size", message: "Party size must be at least 1", status: :bad_request)
    end

    result = RsvpCreator.new.call(event_id: event.id, user_id: current_user.id, party_size: party_size)

    if result.error
      render_error(**result.error.transform_keys(&:to_sym), status: result.http_status)
    else
      meta = {}
      meta["message"] = "You have been placed on the waitlist" if result.rsvp.status == "waitlisted"
      event.reload
      meta["spots_remaining"] = event.spots_remaining
      render_resource("rsvp", result.rsvp, meta: meta, status: result.http_status)
    end
  end

  def index
    event = Event.find(params[:event_id])

    # Visibility check
    if event.attendee_visibility == "organizer_only" && current_user.id != event.organizer_id
      return render_error(code: "forbidden", message: "Attendee list is not visible", status: :forbidden)
    end

    if event.attendee_visibility == "attendees_only"
      my_rsvp = event.rsvps.find_by(user: current_user, status: "accepted")
      unless my_rsvp || current_user.id == event.organizer_id
        return render_error(code: "forbidden", message: "Only attendees can view this list", status: :forbidden)
      end
    end

    rsvps = event.rsvps
    rsvps = rsvps.where(status: params[:status]) if params[:status].present?
    rsvps = rsvps.order(:created_at)

    render_collection("rsvps", rsvps)
  end

  def destroy
    rsvp = Rsvp.find(params[:id])

    unless rsvp.user_id == current_user.id
      return render_error(code: "forbidden", message: "Not your RSVP", status: :forbidden)
    end

    result = RsvpCanceller.new.call(rsvp: rsvp)

    if result.error
      return render_error(**result.error.transform_keys(&:to_sym), status: :unprocessable_entity)
    end

    meta = {}
    meta["undo_token"] = result.undo_token if result.undo_token
    meta["undo_expires_at"] = result.undo_expires_at&.iso8601(3) if result.undo_expires_at

    render_resource("rsvp", result.rsvp, meta: meta)
  end

  def undo
    rsvp = Rsvp.find(params[:id])

    unless rsvp.user_id == current_user.id
      return render_error(code: "forbidden", message: "Not your RSVP", status: :forbidden)
    end

    result = RsvpUndoer.new.call(rsvp: rsvp, token: params[:token])

    if result.error
      render_error(**result.error.transform_keys(&:to_sym), status: result.http_status)
    else
      render_resource("rsvp", result.rsvp)
    end
  end
end
