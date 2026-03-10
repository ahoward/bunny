Rails.application.routes.draw do
  resources :events, only: [:create, :index, :show, :update, :destroy] do
    resources :rsvps, only: [:create, :index], controller: "rsvps"
  end

  resources :rsvps, only: [:destroy] do
    member do
      post :undo
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
