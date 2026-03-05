import { describe, it, expect } from 'bun:test';
import { satisfies } from '../../src/satisfies';
import goldenData from './satisfies.golden.json';

describe('Golden File Tests', () => {
  it('matches known good satisfies outcomes', () => {
    for (const { version, range, expected } of goldenData) {
      expect(satisfies(version, range)).toBe(expected);
    }
  });
});
