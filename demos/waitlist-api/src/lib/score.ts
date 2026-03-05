const MAX_TS = 4102444800; // 2100-01-01 UTC
const EPOCH_SCALE = 1000;

export function base_score(created_at: Date): number {
  return MAX_TS - Math.floor(created_at.getTime() / 1000);
}

export function compute_score(base: number, referral_count: number, reward_amount: number): number {
  return base + referral_count * reward_amount * EPOCH_SCALE;
}
