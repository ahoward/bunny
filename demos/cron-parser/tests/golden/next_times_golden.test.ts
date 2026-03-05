import assert from 'node:assert';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { next_times } from '../../src/cron/index.js';

test('Golden File: next_times complex schedule', () => {
  const fixturePath = path.join(process.cwd(), 'tests/fixtures/golden_next_times.json');
  const expected = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  const res = next_times('15,45 2-4 * * 1-5', '2026-03-01T00:00:00Z', 10);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.deepStrictEqual(res.value, expected);
  }
});
