# Seed data for Event RSVP API
# Run with: rails db:seed

puts "Seeding..."

# Users
alice = User.find_or_create_by!(email: "alice@example.com") do |u|
  u.name = "Alice Johnson"
  u.auth_token = "alice-token-001"
end

bob = User.find_or_create_by!(email: "bob@example.com") do |u|
  u.name = "Bob Smith"
  u.auth_token = "bob-token-002"
end

carol = User.find_or_create_by!(email: "carol@example.com") do |u|
  u.name = "Carol Williams"
  u.auth_token = "carol-token-003"
end

# Events
open_event = Event.find_or_create_by!(title: "Ruby Meetup") do |e|
  e.organizer = alice
  e.description = "Monthly Ruby meetup"
  e.location = "123 Main St"
  e.start_time = 14.days.from_now
  e.end_time = 14.days.from_now + 2.hours
  e.time_zone = "America/New_York"
  e.capacity = 50
end

full_event = Event.find_or_create_by!(title: "Exclusive Workshop") do |e|
  e.organizer = alice
  e.description = "Hands-on workshop"
  e.location = "456 Oak Ave"
  e.start_time = 7.days.from_now
  e.end_time = 7.days.from_now + 4.hours
  e.time_zone = "America/Chicago"
  e.capacity = 5
  e.accepted_count = 5
end

future_reg = Event.find_or_create_by!(title: "Tech Conference") do |e|
  e.organizer = bob
  e.description = "Annual tech conference"
  e.location = "789 Tech Blvd"
  e.start_time = 30.days.from_now
  e.end_time = 30.days.from_now + 8.hours
  e.time_zone = "America/Los_Angeles"
  e.capacity = 200
  e.registration_opens_at = 7.days.from_now
end

small_event = Event.find_or_create_by!(title: "Coffee Chat") do |e|
  e.organizer = carol
  e.description = "Casual coffee meetup"
  e.location = "Corner Cafe"
  e.start_time = 3.days.from_now
  e.end_time = 3.days.from_now + 1.hour
  e.time_zone = "UTC"
  e.capacity = 3
end

private_event = Event.find_or_create_by!(title: "Board Meeting") do |e|
  e.organizer = alice
  e.description = "Quarterly review"
  e.location = "Conference Room A"
  e.start_time = 10.days.from_now
  e.end_time = 10.days.from_now + 2.hours
  e.time_zone = "UTC"
  e.capacity = 10
  e.attendee_visibility = "organizer_only"
end

# RSVPs
Rsvp.find_or_create_by!(event: open_event, user: bob) do |r|
  r.status = "accepted"
  r.party_size = 2
  open_event.update!(accepted_count: open_event.accepted_count + 2)
end

Rsvp.find_or_create_by!(event: small_event, user: alice) do |r|
  r.status = "accepted"
  r.party_size = 1
  small_event.update!(accepted_count: small_event.accepted_count + 1)
end

Rsvp.find_or_create_by!(event: small_event, user: bob) do |r|
  r.status = "accepted"
  r.party_size = 2
  small_event.update!(accepted_count: small_event.accepted_count + 2)
end

Rsvp.find_or_create_by!(event: small_event, user: carol) do |r|
  r.status = "waitlisted"
  r.party_size = 1
  r.waitlist_position = 1
end

puts "Seeded: #{User.count} users, #{Event.count} events, #{Rsvp.count} rsvps"
