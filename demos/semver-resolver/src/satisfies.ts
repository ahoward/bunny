import type { SemVer, Range, ComparatorSet } from './types'
import { parse } from './parse'
import { parse_range } from './parse_range'
import { compare } from './compare'

function test_comparator_set(version: SemVer, set: ComparatorSet): boolean {
  // Pre-release gate (FR-011): if version has prerelease,
  // at least one comparator in this set must reference the same M.m.p tuple
  // and itself have a prerelease
  if (version.prerelease.length > 0) {
    const has_matching = set.some(c =>
      c.version.major === version.major &&
      c.version.minor === version.minor &&
      c.version.patch === version.patch &&
      c.version.prerelease.length > 0
    )
    if (!has_matching) return false
  }

  for (const c of set) {
    const cmp = compare(version, c.version)
    switch (c.operator) {
      case '>=': if (cmp < 0) return false; break
      case '>':  if (cmp <= 0) return false; break
      case '<=': if (cmp > 0) return false; break
      case '<':  if (cmp >= 0) return false; break
      case '=':  if (cmp !== 0) return false; break
    }
  }
  return true
}

export function satisfies(version: string | SemVer, range: string | Range): boolean {
  let v: SemVer
  if (typeof version === 'string') {
    const parsed = parse(version)
    if (!parsed.ok) return false
    v = parsed.value
  } else {
    v = version
  }

  let r: Range
  if (typeof range === 'string') {
    const parsed = parse_range(range)
    if (!parsed.ok) return false
    r = parsed.value
  } else {
    r = range
  }

  for (const set of r) {
    if (test_comparator_set(v, set)) return true
  }
  return false
}
