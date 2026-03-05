import { describe, it, expect } from 'bun:test';
import { parse } from '../../src/parse';
import { satisfies } from '../../src/satisfies';
import { compare } from '../../src/compare';

describe('Boundaries & Edge Cases', () => {
  it('EC-01: Maximum numeric values', () => {
    expect(parse('999999999.999999999.999999999').ok).toBe(true);
  });
  it('Challenge 1: Integer Precision Loss', () => {
    expect(parse('9007199254740992.0.0').ok).toBe(false);
  });
  it('Challenge 2: Hyphen Range vs Pre-release', () => {
    expect(satisfies('1.2.4', '1.2.3-2.0.0')).toBe(false);
  });
  it('Challenge 3: Caret with pre-release', () => {
    expect(satisfies('1.2.4-alpha.1', '^1.2.3-beta.1')).toBe(false);
  });
  it('Challenge 4: Wildcard pre-release leakage', () => {
    expect(satisfies('1.0.0-rc.1', '*')).toBe(false);
  });
  it('Challenge 5: ReDoS prevention (max length)', () => {
    const longString = '1||'.repeat(500);
    // Should reject or parse very fast, just shouldn't hang
    expect(() => satisfies('1.0.0', longString)).not.toThrow();
  });
  it('Challenge 6: < and <= Pre-release Cross-Contamination', () => {
    expect(satisfies('2.0.0-alpha', '<2.0.0')).toBe(false);
  });
  it('Challenge 7: Multi-segment Wildcards', () => {
    expect(satisfies('1.2.3', '1.x.x')).toBe(true);
  });
  it('EC-14: Pre-release ordering', () => {
    const p = (s: string) => parse(s).ok ? (parse(s) as any).value : null;
    expect(compare(p('1.0.0-alpha'), p('1.0.0-alpha.1'))).toBeLessThan(0);
    expect(compare(p('1.0.0-alpha.1'), p('1.0.0-alpha.beta'))).toBeLessThan(0);
    expect(compare(p('1.0.0-alpha.beta'), p('1.0.0-beta'))).toBeLessThan(0);
    expect(compare(p('1.0.0-beta'), p('1.0.0'))).toBeLessThan(0);
  });
});
