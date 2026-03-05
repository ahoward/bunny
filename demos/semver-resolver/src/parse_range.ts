import type { SemVer, Comparator, ComparatorSet, Range, ParseResult } from './types'

const MAX_RANGE_LENGTH = 1024

type PartialVersion = {
  major: number | null  // null = wildcard
  minor: number | null
  patch: number | null
  prerelease: readonly (string | number)[]
  build: readonly string[]
}

function err(msg: string): ParseResult<Range> {
  return { ok: false, error: msg }
}

function sv(major: number, minor: number, patch: number, prerelease: readonly (string | number)[] = []): SemVer {
  return { major, minor, patch, prerelease, build: [] }
}

function is_wildcard(s: string): boolean {
  return s === '*' || s === 'x' || s === 'X'
}

function parse_partial(token: string): PartialVersion | null {
  let s = token.trim()
  if (s === '' || is_wildcard(s)) return { major: null, minor: null, patch: null, prerelease: [], build: [] }

  // extract build
  let build: string[] = []
  const plus = s.indexOf('+')
  if (plus !== -1) {
    build = s.slice(plus + 1).split('.')
    s = s.slice(0, plus)
  }

  // extract prerelease — find hyphen after core
  let prerelease: (string | number)[] = []
  const parts = s.split('.')
  // Check if any non-first part after a hyphen in the last numeric segment
  // Actually, let's find the hyphen in the version string properly
  // Re-join and find hyphen after version core
  let core_str = s
  const dot_parts = s.split('.')
  // find first segment that contains a hyphen (for prerelease)
  let pre_start = -1
  for (let i = 0; i < dot_parts.length; i++) {
    const hi = dot_parts[i].indexOf('-')
    if (hi !== -1 && !is_wildcard(dot_parts[i])) {
      // split this segment
      const before = dot_parts[i].slice(0, hi)
      const after = dot_parts[i].slice(hi + 1)
      dot_parts[i] = before
      const pre_str = after + (i + 1 < dot_parts.length ? '.' + dot_parts.slice(i + 1).join('.') : '')
      dot_parts.length = i + 1
      if (pre_str === '') return null
      for (const p of pre_str.split('.')) {
        if (p === '') return null
        if (/^[0-9]+$/.test(p)) {
          if (p.length > 1 && p[0] === '0') return null
          prerelease.push(Number(p))
        } else if (/^[0-9A-Za-z-]+$/.test(p)) {
          prerelease.push(p)
        } else {
          return null
        }
      }
      break
    }
  }

  const segs = dot_parts
  if (segs.length === 0 || segs.length > 3) return null

  function parse_seg(s: string): number | null {
    if (is_wildcard(s)) return null
    if (!/^[0-9]+$/.test(s)) return null
    if (s.length > 1 && s[0] === '0') return null
    const n = Number(s)
    if (n > Number.MAX_SAFE_INTEGER) return null
    return n
  }

  const major = segs.length > 0 ? parse_seg(segs[0]) : null
  const minor = segs.length > 1 ? parse_seg(segs[1]) : null
  const patch = segs.length > 2 ? parse_seg(segs[2]) : null

  // If major is wildcard and there are more specific segments, that's okay (1.x.x pattern)
  // But if a segment is not a valid number and not a wildcard, reject
  for (let i = 0; i < segs.length; i++) {
    if (!is_wildcard(segs[i]) && !/^[0-9]+$/.test(segs[i])) return null
  }

  // check: if major is null (wildcard), minor/patch wildcards are fine
  // if major is set but minor is wildcard from explicit wildcard, patch must also be wildcard or missing
  const has_wildcard_seg = segs.some(s => is_wildcard(s))
  const is_partial = segs.length < 3 || has_wildcard_seg

  return { major, minor, patch, prerelease, build }
}

function full_version(p: PartialVersion): SemVer {
  return sv(p.major ?? 0, p.minor ?? 0, p.patch ?? 0, p.prerelease)
}

function is_partial(p: PartialVersion): boolean {
  return p.major === null || p.minor === null || p.patch === null
}

function expand_hyphen(set_str: string): Comparator[] | null {
  // Hyphen range: ` - ` with spaces
  const match = set_str.match(/^(.+)\s+-\s+(.+)$/)
  if (!match) return null

  const left = parse_partial(match[1].trim())
  const right = parse_partial(match[2].trim())
  if (!left || !right) return null

  // Left: fill zeros → >=
  const lower: Comparator = { operator: '>=', version: full_version(left) }

  // Right: if full → <=, if partial → < next significant
  let upper: Comparator
  if (right.patch !== null && right.minor !== null && right.major !== null) {
    upper = { operator: '<=', version: full_version(right) }
  } else if (right.minor !== null && right.major !== null) {
    // partial: 2.3 → <2.4.0
    upper = { operator: '<', version: sv(right.major, right.minor + 1, 0) }
  } else if (right.major !== null) {
    upper = { operator: '<', version: sv(right.major + 1, 0, 0) }
  } else {
    // wildcard right — matches anything >= left
    return [lower]
  }

  return [lower, upper]
}

function expand_xrange(token: string): Comparator[] | null {
  const p = parse_partial(token)
  if (!p) return null
  if (!is_partial(p)) return null // not an x-range

  if (p.major === null) {
    // * → match any
    return [{ operator: '>=', version: sv(0, 0, 0) }]
  }
  if (p.minor === null) {
    // 1.x → >=1.0.0 <2.0.0
    return [
      { operator: '>=', version: sv(p.major, 0, 0) },
      { operator: '<', version: sv(p.major + 1, 0, 0) }
    ]
  }
  // 1.2.x → >=1.2.0 <1.3.0
  return [
    { operator: '>=', version: sv(p.major, p.minor, 0) },
    { operator: '<', version: sv(p.major, p.minor + 1, 0) }
  ]
}

function expand_caret(token: string): Comparator[] | null {
  if (!token.startsWith('^')) return null
  const p = parse_partial(token.slice(1))
  if (!p) return null

  const lower = full_version(p)
  let upper: SemVer

  const M = p.major ?? 0
  const m = p.minor
  const pat = p.patch

  if (M !== 0) {
    upper = sv(M + 1, 0, 0)
  } else if (m !== null && m !== 0) {
    upper = sv(0, m + 1, 0)
  } else if (pat !== null && m !== null) {
    // ^0.0.3 → >=0.0.3 <0.0.4
    upper = sv(0, 0, (pat ?? 0) + 1)
  } else if (m === null) {
    // ^0 → >=0.0.0 <1.0.0
    upper = sv(M + 1, 0, 0)
  } else {
    // ^0.0 → >=0.0.0 <0.1.0
    upper = sv(0, (m ?? 0) + 1, 0)
  }

  return [
    { operator: '>=', version: lower },
    { operator: '<', version: upper }
  ]
}

function expand_tilde(token: string): Comparator[] | null {
  if (!token.startsWith('~')) return null
  const p = parse_partial(token.slice(1))
  if (!p) return null

  const lower = full_version(p)
  let upper: SemVer

  if (p.minor !== null) {
    // ~1.2.3 → >=1.2.3 <1.3.0, ~1.2 → >=1.2.0 <1.3.0
    upper = sv(p.major ?? 0, p.minor + 1, 0)
  } else {
    // ~1 → >=1.0.0 <2.0.0
    upper = sv((p.major ?? 0) + 1, 0, 0)
  }

  return [
    { operator: '>=', version: lower },
    { operator: '<', version: upper }
  ]
}

function parse_primitive(token: string): Comparator | null {
  let op_str = ''
  let rest = token

  if (rest.startsWith('>=')) { op_str = '>='; rest = rest.slice(2) }
  else if (rest.startsWith('<=')) { op_str = '<='; rest = rest.slice(2) }
  else if (rest.startsWith('>')) { op_str = '>'; rest = rest.slice(1) }
  else if (rest.startsWith('<')) { op_str = '<'; rest = rest.slice(1) }
  else if (rest.startsWith('=')) { op_str = '='; rest = rest.slice(1) }
  else { op_str = '=' }

  rest = rest.trim()
  if (rest === '') return null

  const p = parse_partial(rest)
  if (!p) return null

  const operator = op_str as Comparator['operator']
  return { operator, version: full_version(p) }
}

function parse_comparator_set(set_str: string): ComparatorSet | string {
  const trimmed = set_str.trim()

  // empty set → match any
  if (trimmed === '' || trimmed === '*' || trimmed === 'x' || trimmed === 'X') {
    return [{ operator: '>=', version: sv(0, 0, 0) }]
  }

  // try hyphen range first
  const hyphen = expand_hyphen(trimmed)
  if (hyphen) return hyphen

  // tokenize by whitespace
  const tokens = trimmed.split(/\s+/)
  const result: Comparator[] = []

  for (const token of tokens) {
    if (token === '') continue

    // try caret
    const caret = expand_caret(token)
    if (caret) { result.push(...caret); continue }

    // try tilde
    const tilde = expand_tilde(token)
    if (tilde) { result.push(...tilde); continue }

    // try x-range
    const xrange = expand_xrange(token)
    if (xrange) { result.push(...xrange); continue }

    // try primitive comparator
    const prim = parse_primitive(token)
    if (prim) { result.push(prim); continue }

    return `invalid comparator: "${token}"`
  }

  return result
}

export function parse_range(input: unknown): ParseResult<Range> {
  if (typeof input !== 'string') return err('input must be a string')
  if (input.length > MAX_RANGE_LENGTH) return err('range string exceeds max length')

  const trimmed = input.trim()
  if (trimmed === '' || trimmed === '*') {
    return { ok: true, value: [[{ operator: '>=', version: sv(0, 0, 0) }]] }
  }

  const or_parts = trimmed.split('||')
  const range: ComparatorSet[] = []

  for (const part of or_parts) {
    const result = parse_comparator_set(part.trim())
    if (typeof result === 'string') return err(result)
    range.push(result)
  }

  return { ok: true, value: range }
}
