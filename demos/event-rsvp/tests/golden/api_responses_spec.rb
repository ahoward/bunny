require 'rails_helper'

RSpec.describe 'API Golden Files', type: :request do
  let(:user) { create(:user) }
  let(:headers) { { 'Authorization' => "Bearer #{user.auth_token}" } }

  it 'matches golden event response' do
    # Freeze time so timestamps match fixtures
    travel_to Time.utc(2026, 3, 10, 12, 0, 0) do
      event = create(:event, 
        id: 42,
        title: 'Golden Event',
        description: 'A perfect event',
        location: '123 Golden St',
        start_time: Time.utc(2026, 4, 1, 10, 0, 0),
        end_time: Time.utc(2026, 4, 1, 12, 0, 0),
        time_zone: 'UTC',
        capacity: 100,
        accepted_count: 5,
        attendee_visibility: 'public'
      )

      get "/events/#{event.id}"
      expect(response).to have_http_status(:ok)
      
      actual_json = JSON.parse(response.body)
      golden_json = JSON.parse(File.read(Rails.root.join('tests', 'fixtures', 'golden_event_response.json')))
      
      # Match attributes, ignore dynamic IDs if necessary (though we forced ID 42)
      expect(actual_json).to eq(golden_json)
    end
  end
end
