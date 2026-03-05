import assert from 'node:assert';
import test from 'node:test';
import { next_times } from '../../src/cron/index.js';

test('US-3.1: Compute next N times', () => {
  const res = next_times('0 * * * *', '2026-03-05T10:30:00Z', 3);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.deepStrictEqual(res.value, ['2026-03-05T11:00:00.000Z', '2026-03-05T12:00:00.000Z', '2026-03-05T13:00:00.000Z']);
  }
});

test('US-4.1: Year and month rollover', () => {
  const res = next_times('59 23 31 12 *', '2026-12-31T23:58:00Z', 2);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.deepStrictEqual(res.value, ['2026-12-31T23:59:00.000Z', '2027-12-31T23:59:00.000Z']);
  }
});

test('US-7: N boundary values', () => {
  const res0 = next_times('* * * * *', '2026-03-05T00:00:00Z', 0);
  assert.strictEqual(res0.ok, true);
  if (res0.ok) assert.strictEqual(res0.value.length, 0);

  const res1 = next_times('* * * * *', '2026-03-05T00:00:00Z', 1);
  assert.strictEqual(res1.ok, true);
  if (res1.ok) assert.strictEqual(res1.value.length, 1);
});
