class EventsController < ApplicationController
  skip_before_action :authenticate!, only: [:index, :show]
  before_action :set_event, only: [:show, :update, :destroy]

  def create
    event = Event.new(event_params)
    event.organizer = current_user

    if event.save
      render_resource("event", event, status: :created)
    else
      if event.errors[:end_time].any? || event.errors[:start_time].any?
        render_error(code: "invalid_time_range", message: "End time must be after start time", status: :unprocessable_entity)
      else
        render_error(code: "validation_failed", message: "Validation failed", details: event.errors.to_hash, status: :unprocessable_entity)
      end
    end
  end

  def index
    skip_auth
    events = Event.where(cancelled_at: nil).order(created_at: :desc, id: :desc)

    # Cursor-based pagination
    if params[:cursor]
      cursor_id = params[:cursor].to_i
      events = events.where("id < ?", cursor_id)
    end

    page_size = (params[:per_page] || 25).to_i
    events = events.limit(page_size + 1).to_a

    has_next = events.size > page_size
    events = events.first(page_size)

    links = {}
    links["next"] = "?cursor=#{events.last.id}" if has_next && events.any?

    render_collection("events", events, meta: { count: events.size }, links: links)
  end

  def show
    skip_auth
    meta = {}
    if current_user
      my_rsvp = @event.rsvps.find_by(user: current_user)
      meta["my_rsvp"] = serialize_rsvp(my_rsvp) if my_rsvp
    end
    render_resource("event", @event, meta: meta)
  end

  def update
    unless @event.organizer_id == current_user.id
      return render_error(code: "forbidden", message: "Only the organizer can update this event", status: :forbidden)
    end

    old_capacity = @event.capacity
    new_capacity = event_params[:capacity]&.to_i

    if new_capacity && new_capacity < @event.accepted_count
      return render_error(
        code: "capacity_conflict",
        message: "Cannot reduce capacity below current accepted count (#{@event.accepted_count})",
        details: { accepted_count: @event.accepted_count, requested_capacity: new_capacity },
        status: :conflict
      )
    end

    if @event.update(event_params)
      # If capacity increased, trigger promotion
      if new_capacity && new_capacity > old_capacity
        WaitlistPromotionJob.perform_later(@event.id)
      end
      render_resource("event", @event)
    else
      render_error(code: "validation_failed", message: "Validation failed", details: @event.errors.to_hash, status: :unprocessable_entity)
    end
  end

  def destroy
    unless @event.organizer_id == current_user.id
      return render_error(code: "forbidden", message: "Only the organizer can cancel this event", status: :forbidden)
    end

    ActiveRecord::Base.transaction do
      @event.update!(cancelled_at: Time.current)
      @event.rsvps.where.not(status: "declined").find_each do |rsvp|
        rsvp.update!(status: "declined")
      end
    end

    render_resource("event", @event, meta: { message: "Event cancelled" })
  end

  private

  def set_event
    @event = Event.find(params[:id])
  end

  def event_params
    params.permit(:title, :description, :location, :start_time, :end_time, :time_zone, :capacity, :registration_opens_at, :registration_closes_at, :attendee_visibility)
  end
end
