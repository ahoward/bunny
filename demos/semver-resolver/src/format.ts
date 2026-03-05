import type { SemVer } from './types'

export function format(v: SemVer): string {
  let s = `${v.major}.${v.minor}.${v.patch}`
  if (v.prerelease.length > 0) s += `-${v.prerelease.join('.')}`
  if (v.build.length > 0) s += `+${v.build.join('.')}`
  return s
}
