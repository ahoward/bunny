import assert from 'node:assert';
import test from 'node:test';
import { parse, next_times } from '../../src/cron/index.js';

test('Challenge 1: Sub-Minute Precision Handling', () => {
  const res = next_times('* * * * *', '2026-03-05T10:30:45.000Z', 1);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.strictEqual(res.value[0], '2026-03-05T10:31:00.000Z');
  }
});

test('Challenge 2: Iteration Guard Return State', () => {
  const res = next_times('0 0 30 2 *', '2026-01-01T00:00:00Z', 5);
  assert.strictEqual(res.ok, false);
  if (!res.ok) {
    assert.match(res.error, /limit|iteration|max/i);
  }
});

test('Challenge 6: Timezone/Local Time Leakage', () => {
  const startDate = new Date('2026-03-05T00:00:00-05:00');
  const res = next_times('0 0 * * *', startDate, 1);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.strictEqual(res.value[0], '2026-03-06T00:00:00.000Z');
  }
});

test('EC-5: Start time exactly matches expression', () => {
  const res = next_times('0 10 * * *', '2026-03-05T10:00:00Z', 1);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.strictEqual(res.value[0], '2026-03-06T10:00:00.000Z');
  }
});
