require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'
abort("The Rails environment is running in production mode!") if Rails.env.production?
require 'rspec/rails'

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end

module EagerLetEvaluation
  def let(name, &block)
    super(name, &block)
    before(:each) { send(name) if respond_to?(name, true) }
  end
end

module ThreadSafeRequests
  %i[get post put patch delete head].each do |method|
    define_method(method) do |*args, **kwargs, &block|
      if Thread.current == Thread.main
        super(*args, **kwargs, &block)
      else
        session = ActionDispatch::Integration::Session.new(Rails.application)
        session.host! "www.example.com"
        session.send(method, *args, **kwargs, &block)
      end
    end
  end
end

RSpec.configure do |config|
  config.fixture_paths = [Rails.root.join('spec/fixtures')]
  config.use_transactional_fixtures = false
  config.include FactoryBot::Syntax::Methods
  config.include ActiveSupport::Testing::TimeHelpers
  config.include ThreadSafeRequests, type: :request
  config.extend EagerLetEvaluation

  config.filter_rails_from_backtrace!

  config.before(:each) do
    tables = ActiveRecord::Base.connection.tables - ['schema_migrations', 'ar_internal_metadata']
    tables.each do |table|
      ActiveRecord::Base.connection.execute("TRUNCATE TABLE #{table} CASCADE")
    end
  end
end
