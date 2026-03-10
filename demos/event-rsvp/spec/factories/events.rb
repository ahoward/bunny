FactoryBot.define do
  factory :event do
    title { Faker::Lorem.sentence(word_count: 3) }
    description { Faker::Lorem.paragraph }
    location { Faker::Address.full_address }
    start_time { 7.days.from_now }
    end_time { 7.days.from_now + 2.hours }
    time_zone { "UTC" }
    capacity { 50 }
    accepted_count { 0 }
    attendee_visibility { "organizer_only" }
    association :organizer, factory: :user
  end
end
