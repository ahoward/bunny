class RsvpUndoer
  Result = Struct.new(:rsvp, :error, :http_status, keyword_init: true)

  def call(rsvp:, token:)
    if rsvp.undo_token.blank? || rsvp.undo_token != token
      return Result.new(error: { code: "invalid_token", message: "Invalid undo token" }, http_status: :unprocessable_entity)
    end

    if rsvp.undo_expires_at.blank? || Time.current >= rsvp.undo_expires_at
      return Result.new(error: { code: "undo_expired", message: "Undo grace period has expired" }, http_status: :gone)
    end

    rsvp.update!(undo_token: nil, undo_expires_at: nil)
    Result.new(rsvp: rsvp, http_status: :ok)
  end
end
