FactoryBot.define do
  factory :rsvp do
    association :event
    association :user
    status { "accepted" }
    party_size { 1 }

    trait :accepted do
      status { "accepted" }
    end

    trait :waitlisted do
      status { "waitlisted" }
      sequence(:waitlist_position) { |n| n }
    end

    trait :declined do
      status { "declined" }
    end
  end
end
