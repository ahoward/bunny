import { describe, it, expect } from 'bun:test';
import { satisfies } from '../../src/satisfies';

describe('US-004: Simple comparator', () => {
  it('>=1.0.0', () => {
    expect(satisfies('1.2.3', '>=1.0.0')).toBe(true);
    expect(satisfies('0.9.0', '>=1.0.0')).toBe(false);
  });
  it('<2.0.0', () => {
    expect(satisfies('1.0.0', '<2.0.0')).toBe(true);
    expect(satisfies('2.0.0', '<2.0.0')).toBe(false);
  });
  it('=1.0.0', () => {
    expect(satisfies('1.0.0', '=1.0.0')).toBe(true);
    expect(satisfies('1.0.1', '=1.0.0')).toBe(false);
  });
});

describe('US-005: Caret range', () => {
  it('^1.2.3', () => {
    expect(satisfies('1.9.9', '^1.2.3')).toBe(true);
    expect(satisfies('2.0.0', '^1.2.3')).toBe(false);
  });
  it('^0.2.3', () => {
    expect(satisfies('0.2.9', '^0.2.3')).toBe(true);
    expect(satisfies('0.3.0', '^0.2.3')).toBe(false);
  });
  it('^0.0.3', () => {
    expect(satisfies('0.0.3', '^0.0.3')).toBe(true);
    expect(satisfies('0.0.4', '^0.0.3')).toBe(false);
  });
});

describe('US-006: Tilde range', () => {
  it('~1.2.3', () => {
    expect(satisfies('1.2.9', '~1.2.3')).toBe(true);
    expect(satisfies('1.3.0', '~1.2.3')).toBe(false);
  });
  it('~1.2', () => {
    expect(satisfies('1.2.3', '~1.2')).toBe(true);
    expect(satisfies('1.3.0', '~1.2')).toBe(false);
  });
});

describe('US-007: Compound and union ranges', () => {
  it('>=1.0.0 <2.0.0', () => {
    expect(satisfies('1.5.0', '>=1.0.0 <2.0.0')).toBe(true);
    expect(satisfies('2.0.0', '>=1.0.0 <2.0.0')).toBe(false);
  });
  it('^1.0.0 || ^2.0.0', () => {
    expect(satisfies('2.5.0', '^1.0.0 || ^2.0.0')).toBe(true);
    expect(satisfies('3.0.0', '^1.0.0 || ^2.0.0')).toBe(false);
  });
  it('1.x || >=2.5.0 || 5.0.0 - 7.2.3', () => {
    expect(satisfies('1.2.3', '1.x || >=2.5.0 || 5.0.0 - 7.2.3')).toBe(true);
  });
});

describe('US-008: Hyphen ranges', () => {
  it('1.2.3 - 2.3.4', () => {
    expect(satisfies('1.2.3', '1.2.3 - 2.3.4')).toBe(true);
    expect(satisfies('2.3.4', '1.2.3 - 2.3.4')).toBe(true);
    expect(satisfies('2.3.5', '1.2.3 - 2.3.4')).toBe(false);
  });
  it('1.2.3 - 2.3', () => {
    expect(satisfies('2.4.0', '1.2.3 - 2.3')).toBe(false);
    expect(satisfies('2.3.9', '1.2.3 - 2.3')).toBe(true);
  });
  it('1.2 - 2.3.4', () => {
    expect(satisfies('1.2.0', '1.2 - 2.3.4')).toBe(true);
  });
});

describe('US-009: X-Ranges', () => {
  it('1.x', () => {
    expect(satisfies('1.9.9', '1.x')).toBe(true);
    expect(satisfies('2.0.0', '1.x')).toBe(false);
  });
  it('1.2.*', () => {
    expect(satisfies('1.2.9', '1.2.*')).toBe(true);
    expect(satisfies('1.3.0', '1.2.*')).toBe(false);
  });
  it('*', () => {
    expect(satisfies('99.99.99', '*')).toBe(true);
    expect(satisfies('0.0.0', '')).toBe(true);
  });
});

describe('US-010: Pre-release Semantics', () => {
  it('excludes pre-release if range has no pre-release', () => {
    expect(satisfies('1.0.0-beta', '>=1.0.0')).toBe(false);
  });
  it('includes pre-release if range has same tuple pre-release', () => {
    expect(satisfies('1.0.0-beta', '>=1.0.0-alpha')).toBe(true);
  });
  it('excludes pre-release if range has different tuple pre-release', () => {
    expect(satisfies('2.0.0-alpha', '>=1.0.0-0')).toBe(false);
  });
  it('exact pre-release match', () => {
    expect(satisfies('1.0.0-alpha.1', '1.0.0-alpha.1')).toBe(true);
  });
  it('different patch pre-release', () => {
    expect(satisfies('1.0.1-beta', '~1.0.0-alpha')).toBe(false);
  });
});
