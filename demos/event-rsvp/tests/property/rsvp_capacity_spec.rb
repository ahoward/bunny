require 'rails_helper'

RSpec.describe 'RSVP Capacity Properties', type: :request do
  let(:organizer) { create(:user) }
  let(:headers) { { 'Authorization' => "Bearer #{organizer.auth_token}" } }

  it 'maintains capacity invariant across random sequence of RSVPs' do
    event = create(:event, capacity: 100)
    users = create_list(:user, 40)
    
    # Generate random sequence of party sizes
    party_sizes = Array.new(40) { rand(1..5) }
    
    party_sizes.each_with_index do |size, idx|
      user_headers = { 'Authorization' => "Bearer #{users[idx].auth_token}" }
      post "/events/#{event.id}/rsvps", params: { party_size: size }, headers: user_headers
    end
    
    event.reload
    expect(event.accepted_count).to be <= 100
    
    accepted_rsvps = Rsvp.where(event: event, status: 'accepted')
    waitlisted_rsvps = Rsvp.where(event: event, status: 'waitlisted')
    
    # Property 1: The sum of party_size for accepted RSVPs equals accepted_count
    expect(accepted_rsvps.sum(:party_size)).to eq(event.accepted_count)
    
    # Property 2: If there are waitlisted RSVPs, accepted_count must be close to capacity
    if waitlisted_rsvps.any?
      first_waitlisted = waitlisted_rsvps.order(:waitlist_position).first
      # The first waitlisted person couldn't fit
      expect(event.accepted_count + first_waitlisted.party_size).to be > event.capacity
    end
  end

  it 'is idempotent for identical requests (US-013)' do
    event = create(:event)
    user = create(:user)
    user_headers = { 'Authorization' => "Bearer #{user.auth_token}" }

    post "/events/#{event.id}/rsvps", params: { party_size: 2 }, headers: user_headers
    expect(response).to have_http_status(:created)
    first_response = JSON.parse(response.body)

    # Duplicate request
    post "/events/#{event.id}/rsvps", params: { party_size: 2 }, headers: user_headers
    expect(response).to have_http_status(:ok)
    second_response = JSON.parse(response.body)

    expect(first_response['rsvp']['id']).to eq(second_response['rsvp']['id'])
    expect(Rsvp.where(user: user, event: event).count).to eq(1)
  end
end
