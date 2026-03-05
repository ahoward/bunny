import { expect, test, describe } from 'bun:test';
import { apply } from '../src/index.ts';
import * as fs from 'fs';
import * as path from 'path';

describe('Golden File Tests', () => {
  test('Applies known-good patches correctly', () => {
    const fixturePath = path.join(import.meta.dir, 'fixtures', 'golden.json');
    const goldenData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    for (const { document, patch, expected, error } of goldenData) {
      const result = apply(document, patch);
      if (error) {
        expect(result.ok).toBe(false);
      } else {
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toEqual(expected);
        }
      }
    }
  });
});
