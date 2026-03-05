import type { SemVer } from './types'

function cmp_num(a: number, b: number): -1 | 0 | 1 {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function cmp_id(a: string | number, b: string | number): -1 | 0 | 1 {
  if (typeof a === 'number' && typeof b === 'number') return cmp_num(a, b)
  if (typeof a === 'number') return -1 // numeric < string
  if (typeof b === 'number') return 1
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function compare(a: SemVer, b: SemVer): -1 | 0 | 1 {
  let r = cmp_num(a.major, b.major)
  if (r !== 0) return r
  r = cmp_num(a.minor, b.minor)
  if (r !== 0) return r
  r = cmp_num(a.patch, b.patch)
  if (r !== 0) return r

  // no prerelease > has prerelease
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0
  if (a.prerelease.length === 0) return 1  // a is release, b is pre-release
  if (b.prerelease.length === 0) return -1 // a is pre-release, b is release

  const len = Math.min(a.prerelease.length, b.prerelease.length)
  for (let i = 0; i < len; i++) {
    r = cmp_id(a.prerelease[i], b.prerelease[i])
    if (r !== 0) return r
  }

  return cmp_num(a.prerelease.length, b.prerelease.length)
}
