class WaitlistPromotionJob < ApplicationJob
  queue_as :promotions

  def perform(event_id)
    WaitlistPromoter.new.call(event_id: event_id)
  end
end
