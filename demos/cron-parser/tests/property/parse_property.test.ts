import assert from 'node:assert';
import test from 'node:test';
import { parse } from '../../src/cron/index.js';

test('Property: Valid fields always produce sorted, in-bounds arrays', () => {
  const minutes = ['*', '0-59', '*/15', '1,2,3'];
  const hours = ['*', '0-23', '*/4', '12'];

  for (const min of minutes) {
    for (const hr of hours) {
      const expr = `${min} ${hr} * * *`;
      const res = parse(expr);
      assert.strictEqual(res.ok, true, `Should parse ${expr}`);
      if (res.ok) {
        const isSorted = (arr: number[]) => arr.every((v, i, a) => !i || a[i-1] <= v);
        assert.strictEqual(isSorted(res.value.minutes), true);
        assert.strictEqual(isSorted(res.value.hours), true);
        assert.strictEqual(res.value.minutes.every(m => m >= 0 && m <= 59), true);
        assert.strictEqual(res.value.hours.every(h => h >= 0 && h <= 23), true);
      }
    }
  }
});
