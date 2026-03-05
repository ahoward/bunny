import { describe, it, expect } from 'bun:test';
import { parse } from '../../src/parse';

describe('US-001: Parse a valid semver string', () => {
  it('parses 1.2.3', () => {
    expect(parse('1.2.3')).toEqual({ ok: true, value: { major: 1, minor: 2, patch: 3, prerelease: [], build: [] } });
  });
  it('parses 0.0.0', () => {
    expect(parse('0.0.0')).toEqual({ ok: true, value: { major: 0, minor: 0, patch: 0, prerelease: [], build: [] } });
  });
  it('parses with pre-release', () => {
    expect(parse('1.0.0-alpha.1')).toEqual({ ok: true, value: { major: 1, minor: 0, patch: 0, prerelease: ['alpha', 1], build: [] } });
  });
  it('parses with build metadata', () => {
    expect(parse('1.0.0+build.42')).toEqual({ ok: true, value: { major: 1, minor: 0, patch: 0, prerelease: [], build: ['build', '42'] } });
  });
  it('parses with both', () => {
    expect(parse('1.0.0-beta.2+sha.abc')).toEqual({ ok: true, value: { major: 1, minor: 0, patch: 0, prerelease: ['beta', 2], build: ['sha', 'abc'] } });
  });
});

describe('US-002: Reject invalid version strings', () => {
  it('rejects not.a.version', () => {
    expect(parse('not.a.version').ok).toBe(false);
  });
  it('rejects missing patch', () => {
    expect(parse('1.2').ok).toBe(false);
  });
  it('rejects leading zero', () => {
    expect(parse('01.2.3').ok).toBe(false);
  });
  it('rejects empty string', () => {
    expect(parse('').ok).toBe(false);
  });
  it('rejects extra segment', () => {
    expect(parse('1.2.3.4').ok).toBe(false);
  });
});

describe('US-012: Coerce non-strict version strings', () => {
  it('strips v prefix', () => {
    expect(parse('v1.2.3', { loose: true })).toEqual({ ok: true, value: { major: 1, minor: 2, patch: 3, prerelease: [], build: [] } });
  });
  it('fills missing patch', () => {
    expect(parse('1.2', { loose: true })).toEqual({ ok: true, value: { major: 1, minor: 2, patch: 0, prerelease: [], build: [] } });
  });
  it('fills missing minor and patch', () => {
    expect(parse('1', { loose: true })).toEqual({ ok: true, value: { major: 1, minor: 0, patch: 0, prerelease: [], build: [] } });
  });
  it('rejects v prefix in strict mode', () => {
    expect(parse('v1.2.3').ok).toBe(false);
  });
});
