FactoryBot.define do
  factory :user do
    name { Faker::Name.name }
    email { Faker::Internet.unique.email }
    auth_token { SecureRandom.urlsafe_base64(32) }
  end
end
