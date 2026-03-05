import assert from 'node:assert';
import test from 'node:test';
import { parse } from '../../src/cron/index.js';

test('US-1.1: Parse valid expression', () => {
  const res = parse('*/15 0 1,15 * 1-5');
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.deepStrictEqual(res.value.minutes, [0, 15, 30, 45]);
    assert.deepStrictEqual(res.value.hours, [0]);
    assert.deepStrictEqual(res.value.days_of_month, [1, 15]);
    assert.strictEqual(res.value.months.length, 12);
    assert.deepStrictEqual(res.value.days_of_week, [1, 2, 3, 4, 5]);
  }
});

test('US-1.3: Normalize 7 to 0 for Sunday', () => {
  const res = parse('5 4 * * 0,7');
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.deepStrictEqual(res.value.days_of_week, [0]);
  }
});

test('US-2: Reject invalid expressions', () => {
  assert.strictEqual(parse('* * *').ok, false);
  assert.strictEqual(parse('60 * * * *').ok, false);
  assert.strictEqual(parse('* 24 * * *').ok, false);
  assert.strictEqual(parse('* * 0 * *').ok, false);
  assert.strictEqual(parse('* * * 13 *').ok, false);
  assert.strictEqual(parse('* * * * 8').ok, false);
  assert.strictEqual(parse('').ok, false);
  assert.strictEqual(parse('*/0 * * * *').ok, false);
});
