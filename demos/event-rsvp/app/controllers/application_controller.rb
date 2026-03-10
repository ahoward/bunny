class ApplicationController < ActionController::API
  before_action :authenticate!

  rescue_from ActiveRecord::RecordNotFound do |e|
    render_error(code: "not_found", message: e.message, status: :not_found)
  end

  rescue_from ActiveRecord::RecordInvalid do |e|
    render_error(code: "validation_failed", message: e.message, details: e.record&.errors&.to_hash, status: :unprocessable_entity)
  end

  rescue_from AASM::InvalidTransition do |e|
    render_error(code: "invalid_transition", message: e.message, status: :unprocessable_entity)
  end

  private

  def authenticate!
    token = request.headers["Authorization"]&.split("Bearer ")&.last
    @current_user = User.find_by(auth_token: token) if token
    render_error(code: "unauthorized", message: "Authentication required", status: :unauthorized) unless @current_user
  end

  def current_user
    @current_user
  end

  def skip_auth
    @current_user = User.find_by(auth_token: request.headers["Authorization"]&.split("Bearer ")&.last)
  end

  def render_resource(name, object, meta: {}, status: :ok)
    render json: { name.to_s => serialize_resource(object), "meta" => meta }, status: status
  end

  def render_collection(name, objects, meta: {}, links: {}, status: :ok)
    render json: { name.to_s => objects.map { |o| serialize_resource(o) }, "meta" => meta, "links" => links }, status: status
  end

  def render_error(code:, message:, details: {}, status:)
    render json: { "error" => { "code" => code, "message" => message, "details" => details || {} } }, status: status
  end

  def serialize_resource(obj)
    case obj
    when Event
      serialize_event(obj)
    when Rsvp
      serialize_rsvp(obj)
    else
      obj.as_json
    end
  end

  def serialize_event(event)
    {
      "id" => event.id,
      "title" => event.title,
      "description" => event.description,
      "location" => event.location,
      "start_time" => event.start_time&.iso8601(3),
      "end_time" => event.end_time&.iso8601(3),
      "time_zone" => event.time_zone,
      "capacity" => event.capacity,
      "spots_remaining" => event.spots_remaining,
      "registration_opens_at" => event.registration_opens_at&.iso8601(3),
      "registration_closes_at" => event.registration_closes_at&.iso8601(3),
      "attendee_visibility" => event.attendee_visibility
    }
  end

  def serialize_rsvp(rsvp)
    result = {
      "id" => rsvp.id,
      "event_id" => rsvp.event_id,
      "user_id" => rsvp.user_id,
      "status" => rsvp.status,
      "party_size" => rsvp.party_size,
      "waitlist_position" => rsvp.waitlist_position,
      "created_at" => rsvp.created_at&.iso8601(3),
      "updated_at" => rsvp.updated_at&.iso8601(3)
    }
    result
  end
end
