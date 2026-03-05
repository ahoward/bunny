import { describe, it, expect } from 'bun:test';
import { compare } from '../../src/compare';
import { parse } from '../../src/parse';

function v(str: string) {
  const res = parse(str);
  if (!res.ok) throw new Error(`Failed to parse ${str}`);
  return res.value;
}

describe('US-003: Compare two versions', () => {
  it('1.0.0 < 2.0.0', () => {
    expect(compare(v('1.0.0'), v('2.0.0'))).toBeLessThan(0);
  });
  it('1.2.3 == 1.2.3', () => {
    expect(compare(v('1.2.3'), v('1.2.3'))).toBe(0);
  });
  it('1.0.0-alpha < 1.0.0', () => {
    expect(compare(v('1.0.0-alpha'), v('1.0.0'))).toBeLessThan(0);
  });
  it('1.0.0-alpha < 1.0.0-alpha.1', () => {
    expect(compare(v('1.0.0-alpha'), v('1.0.0-alpha.1'))).toBeLessThan(0);
  });
  it('1.0.0-alpha < 1.0.0-beta', () => {
    expect(compare(v('1.0.0-alpha'), v('1.0.0-beta'))).toBeLessThan(0);
  });
  it('1.0.0-1 < 1.0.0-alpha', () => {
    expect(compare(v('1.0.0-1'), v('1.0.0-alpha'))).toBeLessThan(0);
  });
  it('build metadata ignored', () => {
    expect(compare(v('1.0.0+build1'), v('1.0.0+build2'))).toBe(0);
  });
});
