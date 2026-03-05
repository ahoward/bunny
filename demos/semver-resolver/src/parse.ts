import type { SemVer, ParseResult, ParseOptions } from './types'

const MAX_LENGTH = 256

function err(msg: string): ParseResult<SemVer> {
  return { ok: false, error: msg }
}

function is_numeric(s: string): boolean {
  return /^[0-9]+$/.test(s)
}

function parse_core_segment(s: string): number | null {
  if (!is_numeric(s)) return null
  if (s.length > 1 && s[0] === '0') return null // leading zero
  const n = Number(s)
  if (n > Number.MAX_SAFE_INTEGER) return null
  return n
}

function parse_prerelease_id(s: string): string | number | null {
  if (s === '') return null
  if (is_numeric(s)) {
    if (s.length > 1 && s[0] === '0') return null // leading zeros
    return Number(s)
  }
  if (/^[0-9A-Za-z-]+$/.test(s)) return s
  return null
}

export function parse(input: unknown, opts?: ParseOptions): ParseResult<SemVer> {
  if (typeof input !== 'string') return err('input must be a string')
  if (input.length === 0) return err('empty string')
  if (input.length > MAX_LENGTH) return err('input exceeds max length')

  let s = input
  const loose = opts?.loose === true

  if (loose) {
    if (s[0] === 'v' || s[0] === '=') s = s.slice(1)
  } else {
    if (s[0] === 'v' || s[0] === '=') return err('unexpected prefix in strict mode')
  }

  // split build metadata first
  let build: string[] = []
  const plus_idx = s.indexOf('+')
  if (plus_idx !== -1) {
    const build_str = s.slice(plus_idx + 1)
    s = s.slice(0, plus_idx)
    if (build_str === '') return err('empty build metadata')
    const parts = build_str.split('.')
    for (const p of parts) {
      if (p === '') return err('empty build identifier')
      if (!/^[0-9A-Za-z-]+$/.test(p)) return err('invalid build identifier')
    }
    build = parts
  }

  // split prerelease — find the first `-` after the version core
  let prerelease: (string | number)[] = []
  const dot1 = s.indexOf('.')
  const dot2 = dot1 !== -1 ? s.indexOf('.', dot1 + 1) : -1
  // In strict mode we need exactly M.N.P, find hyphen after that
  let hyphen_idx = -1
  if (dot2 !== -1) {
    // find next non-digit after dot2+1 to locate end of patch
    let patch_end = dot2 + 1
    while (patch_end < s.length && s[patch_end] >= '0' && s[patch_end] <= '9') patch_end++
    if (patch_end < s.length && s[patch_end] === '-') {
      hyphen_idx = patch_end
    }
  } else if (loose) {
    // In loose mode with fewer dots, hyphen could follow the last segment
    const last_dot = s.lastIndexOf('.')
    let seg_end = last_dot !== -1 ? last_dot + 1 : 0
    while (seg_end < s.length && s[seg_end] >= '0' && s[seg_end] <= '9') seg_end++
    if (seg_end < s.length && s[seg_end] === '-') {
      hyphen_idx = seg_end
    }
  }

  if (hyphen_idx !== -1) {
    const pre_str = s.slice(hyphen_idx + 1)
    s = s.slice(0, hyphen_idx)
    if (pre_str === '') return err('empty prerelease')
    const parts = pre_str.split('.')
    for (const p of parts) {
      const id = parse_prerelease_id(p)
      if (id === null) return err(`invalid prerelease identifier: "${p}"`)
      prerelease.push(id)
    }
  }

  // parse core
  const segments = s.split('.')

  if (loose) {
    if (segments.length > 3) return err('too many segments')
    while (segments.length < 3) segments.push('0')
  } else {
    if (segments.length !== 3) return err('version must have exactly 3 components')
  }

  const major = parse_core_segment(segments[0])
  const minor = parse_core_segment(segments[1])
  const patch = parse_core_segment(segments[2])

  if (major === null) return err('invalid major version')
  if (minor === null) return err('invalid minor version')
  if (patch === null) return err('invalid patch version')

  return { ok: true, value: { major, minor, patch, prerelease, build } }
}
