import { ok, err, type CronResult } from "./types.js"

export function expand_field(token: string, min: number, max: number): CronResult<number[]> {
  if (token === "*") {
    return ok(range(min, max))
  }

  const parts = token.split(",")
  if (parts.some(p => p === "")) {
    return err(`invalid token: "${token}"`)
  }

  const result: Set<number> = new Set()

  for (const part of parts) {
    const expanded = expand_part(part, min, max)
    if (!expanded.ok) return expanded
    for (const v of expanded.value) result.add(v)
  }

  const sorted = [...result].sort((a, b) => a - b)
  return ok(sorted)
}

function expand_part(part: string, min: number, max: number): CronResult<number[]> {
  // handle step: something/step
  const slash_idx = part.indexOf("/")
  if (slash_idx !== -1) {
    const base = part.substring(0, slash_idx)
    const step_str = part.substring(slash_idx + 1)

    if (step_str === "" || !is_numeric(step_str)) {
      return err(`invalid step in "${part}"`)
    }
    const step = Number(step_str)
    if (step === 0) return err(`invalid step value 0 in "${part}"`)

    if (base === "*") {
      return ok(stepped_range(min, max, step))
    }

    // range/step: a-b/s
    if (base.includes("-")) {
      const rng = parse_range(base, min, max)
      if (!rng.ok) return rng
      const [start, end] = rng.value
      return ok(stepped_range(start, end, step))
    }

    // single/step: a/s
    if (!is_numeric(base)) {
      return err(`invalid token: "${part}"`)
    }
    const start = Number(base)
    if (start < min || start > max) {
      return err(`value ${start} out of range ${min}-${max}`)
    }
    return ok(stepped_range(start, max, step))
  }

  // handle range: a-b
  if (part.includes("-")) {
    const rng = parse_range(part, min, max)
    if (!rng.ok) return rng
    const [start, end] = rng.value
    return ok(range(start, end))
  }

  // single value
  if (!is_numeric(part)) {
    return err(`invalid token: "${part}"`)
  }
  const val = Number(part)
  if (val < min || val > max) {
    return err(`value ${val} out of range ${min}-${max}`)
  }
  return ok([val])
}

function parse_range(s: string, min: number, max: number): CronResult<[number, number]> {
  const parts = s.split("-")
  if (parts.length !== 2 || parts[0] === "" || parts[1] === "") {
    return err(`invalid range: "${s}"`)
  }
  if (!is_numeric(parts[0]) || !is_numeric(parts[1])) {
    return err(`invalid range: "${s}"`)
  }
  const start = Number(parts[0])
  const end = Number(parts[1])
  if (start < min || start > max) return err(`value ${start} out of range ${min}-${max}`)
  if (end < min || end > max) return err(`value ${end} out of range ${min}-${max}`)
  if (start > end) return err(`invalid range: start ${start} > end ${end}`)
  return ok([start, end] as [number, number])
}

function is_numeric(s: string): boolean {
  if (s === "") return false
  return /^\d+$/.test(s)
}

function range(start: number, end: number): number[] {
  const result: number[] = []
  for (let i = start; i <= end; i++) result.push(i)
  return result
}

function stepped_range(start: number, end: number, step: number): number[] {
  const result: number[] = []
  for (let i = start; i <= end; i += step) result.push(i)
  return result
}
