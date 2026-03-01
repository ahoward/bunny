import { describe, test, expect, beforeEach } from "bun:test"
import app from "../../src/app.ts"
import "../../src/index.ts"
import { clear_moods, write_moods } from "../../src/lib/store.ts"
import type { MoodEntry, DailyBreakdown } from "../../src/lib/types.ts"

describe("GET /trends/team", () => {
  beforeEach(async () => {
    await clear_moods()
  })

  test("returns empty trends when no moods exist", async () => {
    const result = await app.call("/trends/team")
    expect(result.status).toBe("success")
    const data = result.result as { daily: DailyBreakdown[]; team_average: null; total_entries: number }
    expect(data.daily).toEqual([])
    expect(data.team_average).toBeNull()
    expect(data.total_entries).toBe(0)
  })

  test("returns team average and daily breakdown", async () => {
    await app.call("/moods/create", { user_email: "alice@co.com", score: 4 })
    await app.call("/moods/create", { user_email: "bob@co.com", score: 2 })

    const result = await app.call("/trends/team")
    expect(result.status).toBe("success")

    const data = result.result as {
      team_average: number
      daily: DailyBreakdown[]
      total_entries: number
      period_days: number
    }

    expect(data.total_entries).toBe(2)
    expect(data.period_days).toBe(30)
    expect(data.team_average).toBe(3)
    expect(data.daily.length).toBe(1)
    expect(data.daily[0].average_score).toBe(3)
    expect(data.daily[0].entry_count).toBe(2)
  })

  test("groups entries by date in oldest-first order", async () => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const entries: MoodEntry[] = [
      { id: crypto.randomUUID(), user_email: "a@co.com", score: 5, note: null, timestamp: yesterday.toISOString() },
      { id: crypto.randomUUID(), user_email: "b@co.com", score: 3, note: null, timestamp: yesterday.toISOString() },
      { id: crypto.randomUUID(), user_email: "a@co.com", score: 1, note: null, timestamp: today.toISOString() },
    ]
    await write_moods(entries)

    const result = await app.call("/trends/team")
    const data = result.result as { daily: DailyBreakdown[] }

    expect(data.daily.length).toBe(2)
    // oldest first
    expect(data.daily[0].date < data.daily[1].date).toBe(true)
    expect(data.daily[0].average_score).toBe(4)   // (5+3)/2
    expect(data.daily[0].entry_count).toBe(2)
    expect(data.daily[1].average_score).toBe(1)
    expect(data.daily[1].entry_count).toBe(1)
  })

  test("excludes moods older than 30 days", async () => {
    const old_date = new Date()
    old_date.setDate(old_date.getDate() - 31)

    const entries: MoodEntry[] = [
      { id: crypto.randomUUID(), user_email: "old@co.com", score: 1, note: null, timestamp: old_date.toISOString() },
      { id: crypto.randomUUID(), user_email: "new@co.com", score: 5, note: null, timestamp: new Date().toISOString() },
    ]
    await write_moods(entries)

    const result = await app.call("/trends/team")
    const data = result.result as { daily: DailyBreakdown[]; total_entries: number }

    expect(data.total_entries).toBe(1)
    expect(data.daily.length).toBe(1)
    expect(data.daily[0].average_score).toBe(5)
  })
})
