import { test, expect, describe } from 'bun:test';
import { compute_score, base_score } from '../../src/lib/score';

describe('Property: Score Calculation', () => {
  test('Monotonicity: Higher referral count always increases score (given same base)', () => {
    const base = 1000000;
    const reward = 5;
    for (let i = 0; i < 100; i++) {
      const lower = compute_score(base, i, reward);
      const higher = compute_score(base, i + 1, reward);
      expect(higher).toBeGreaterThan(lower);
    }
  });

  test('Identity: Zero referrals returns base score', () => {
    const base = 500000;
    expect(compute_score(base, 0, 10)).toBe(base);
  });
});
