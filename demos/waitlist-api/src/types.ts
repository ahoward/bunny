export type EntryStatus = 'waiting' | 'promoted' | 'cancelled';
export type EventType = 'signup' | 'referral' | 'promotion' | 'cancellation';
export type WebhookStatus = 'pending' | 'delivered' | 'failed' | 'skipped';

export type ReferralReward = {
  type: 'position_bump';
  amount: number;
};

export type WaitlistSettings = {
  webhook_url: string | null;
  webhook_secret: string | null;
  referral_reward: ReferralReward;
  queue_strategy: 'score';
};

export type Waitlist = {
  id: string;
  name: string;
  owner_id: string;
  settings: WaitlistSettings;
  created_at: string;
};

export type Entry = {
  id: string;
  waitlist_id: string;
  email: string;
  name: string | null;
  referral_code: string;
  referred_by: string | null;
  score: number;
  status: EntryStatus;
  email_verified: boolean;
  ip_hash: string | null;
  promoted_at: string | null;
  created_at: string;
};

export type Event = {
  id: string;
  waitlist_id: string;
  entry_id: string;
  type: EventType;
  payload: string;
  webhook_status: WebhookStatus;
  attempts: number;
  created_at: string;
};
