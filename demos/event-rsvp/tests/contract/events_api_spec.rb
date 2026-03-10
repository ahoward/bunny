require 'rails_helper'

RSpec.describe 'Events API Contract', type: :request do
  let(:organizer) { create(:user) }
  let(:user) { create(:user) }
  let(:headers) { { 'Authorization' => "Bearer #{organizer.auth_token}" } }
  let(:user_headers) { { 'Authorization' => "Bearer #{user.auth_token}" } }

  describe 'US-001: Create an Event' do
    it 'returns 201 Created on successful event creation' do
      post '/events', params: { title: 'Test Event', start_time: 1.day.from_now, end_time: 2.days.from_now, capacity: 50, time_zone: 'UTC' }, headers: headers
      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body).dig('event', 'title')).to eq('Test Event')
    end

    it 'returns 422 on missing fields' do
      post '/events', params: { capacity: 50 }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'returns 422 on invalid time range' do
      post '/events', params: { title: 'Bad Time', start_time: 2.days.from_now, end_time: 1.day.from_now, capacity: 50, time_zone: 'UTC' }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body).dig('error', 'code')).to eq('invalid_time_range')
    end
  end

  describe 'US-002: RSVP to an Event (Under Capacity)' do
    let(:event) { create(:event, capacity: 50, accepted_count: 30) }

    it 'accepts RSVP and increments accepted_count' do
      post "/events/#{event.id}/rsvps", headers: user_headers
      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body).dig('rsvp', 'status')).to eq('accepted')
    end

    it 'handles party_size correctly' do
      post "/events/#{event.id}/rsvps", params: { party_size: 3 }, headers: user_headers
      expect(response).to have_http_status(:created)
      expect(event.reload.accepted_count).to eq(33)
    end
  end

  describe 'US-003: RSVP to a Full Event (Waitlisted)' do
    let(:event) { create(:event, capacity: 50, accepted_count: 50) }

    it 'places user on waitlist' do
      post "/events/#{event.id}/rsvps", headers: user_headers
      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json.dig('rsvp', 'status')).to eq('waitlisted')
      expect(json.dig('rsvp', 'waitlist_position')).to eq(1)
    end
  end

  describe 'US-004 & US-006: Cancel and Undo RSVP' do
    let(:event) { create(:event, capacity: 50) }
    let(:rsvp) { create(:rsvp, event: event, user: user, status: 'accepted') }

    it 'returns an undo token on cancellation and allows undo within grace period' do
      delete "/rsvps/#{rsvp.id}", headers: user_headers
      expect(response).to have_http_status(:ok)
      undo_token = JSON.parse(response.body).dig('meta', 'undo_token')
      expect(undo_token).to be_present

      post "/rsvps/#{rsvp.id}/undo", params: { token: undo_token }, headers: user_headers
      expect(response).to have_http_status(:ok)
      expect(rsvp.reload.status).to eq('accepted')
    end
  end
end
