require 'rails_helper'

RSpec.describe 'API Boundary and Edge Cases', type: :request do
  let(:user) { create(:user) }
  let(:headers) { { 'Authorization' => "Bearer #{user.auth_token}" } }

  describe 'E-001: Concurrent RSVPs for the last spot' do
    it 'handles last-spot race conditions without exceeding capacity' do
      event = create(:event, capacity: 50, accepted_count: 49)
      users = create_list(:user, 5)
      
      threads = users.map do |u|
        Thread.new do
          user_headers = { 'Authorization' => "Bearer #{u.auth_token}" }
          post "/events/#{event.id}/rsvps", headers: user_headers
        end
      end
      threads.each(&:join)
      
      expect(event.reload.accepted_count).to eq(50)
      expect(event.rsvps.where(status: 'accepted').count).to eq(1)
      expect(event.rsvps.where(status: 'waitlisted').count).to eq(4)
    end
  end

  describe 'E-005 & US-014: Registration Window Boundaries' do
    it 'accepts RSVP 1 second before registration closes' do
      event = create(:event, registration_closes_at: 10.seconds.from_now)
      travel_to(9.seconds.from_now) do
        post "/events/#{event.id}/rsvps", headers: headers
        expect(response).to have_http_status(:created)
      end
    end

    it 'rejects RSVP exactly at registration close time' do
      event = create(:event, registration_closes_at: 10.seconds.from_now)
      travel_to(10.seconds.from_now) do
        post "/events/#{event.id}/rsvps", headers: headers
        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body).dig('error', 'code')).to eq('registration_closed')
      end
    end
  end

  describe 'E-009 & E-010: Party Size Boundaries' do
    let(:event) { create(:event, capacity: 10) }

    it 'rejects party size 0' do
      post "/events/#{event.id}/rsvps", params: { party_size: 0 }, headers: headers
      expect(response).to have_http_status(:bad_request)
    end

    it 'rejects party size greater than capacity' do
      post "/events/#{event.id}/rsvps", params: { party_size: 11 }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body).dig('error', 'code')).to eq('party_size_exceeds_capacity')
    end
  end

  describe 'E-003: Undo expiry boundary' do
    let(:event) { create(:event) }
    let(:rsvp) { create(:rsvp, event: event, user: user, status: 'accepted', undo_token: 'tok', undo_expires_at: 5.minutes.from_now) }

    it 'rejects undo exactly at or after grace period expires' do
      travel_to(5.minutes.from_now + 1.second) do
        post "/rsvps/#{rsvp.id}/undo", params: { token: 'tok' }, headers: headers
        expect(response).to have_http_status(:gone)
        expect(JSON.parse(response.body).dig('error', 'code')).to eq('undo_expired')
      end
    end
  end
end
