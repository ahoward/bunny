import { describe, test, expect, beforeEach } from "bun:test"
import app from "../../src/app.ts"
import "../../src/index.ts"
import { clear_moods, write_moods } from "../../src/lib/store.ts"
import type { MoodEntry, DailyBreakdown } from "../../src/lib/types.ts"

describe("GET /trends/person", () => {
  beforeEach(async () => {
    await clear_moods()
  })

  test("requires user_email", async () => {
    const result = await app.call("/trends/person")
    expect(result.status).toBe("error")
    expect(result.errors!.user_email).toBeTruthy()
  })

  test("rejects empty user_email", async () => {
    const result = await app.call("/trends/person", { user_email: "" })
    expect(result.status).toBe("error")
  })

  test("rejects whitespace-only user_email", async () => {
    const result = await app.call("/trends/person", { user_email: "   " })
    expect(result.status).toBe("error")
    expect(result.errors!.user_email).toBeTruthy()
  })

  test("trims user_email whitespace", async () => {
    await app.call("/moods/create", { user_email: "alice@co.com", score: 4 })
    const result = await app.call("/trends/person", { user_email: "  alice@co.com  " })
    expect(result.status).toBe("success")
    const data = result.result as { user_email: string; total_entries: number }
    expect(data.user_email).toBe("alice@co.com")
    expect(data.total_entries).toBe(1)
  })

  test("returns empty trends for unknown user", async () => {
    const result = await app.call("/trends/person", { user_email: "nobody@co.com" })
    expect(result.status).toBe("success")

    const data = result.result as { daily: DailyBreakdown[]; average_score: null; total_entries: number }
    expect(data.daily).toEqual([])
    expect(data.average_score).toBeNull()
    expect(data.total_entries).toBe(0)
  })

  test("returns person average and daily breakdown", async () => {
    await app.call("/moods/create", { user_email: "alice@co.com", score: 4 })
    await app.call("/moods/create", { user_email: "alice@co.com", score: 2 })
    await app.call("/moods/create", { user_email: "bob@co.com", score: 5 })

    const result = await app.call("/trends/person", { user_email: "alice@co.com" })
    expect(result.status).toBe("success")

    const data = result.result as {
      user_email: string
      average_score: number
      daily: DailyBreakdown[]
      total_entries: number
      period_days: number
    }

    expect(data.user_email).toBe("alice@co.com")
    expect(data.total_entries).toBe(2)
    expect(data.period_days).toBe(30)
    expect(data.average_score).toBe(3)
    expect(data.daily.length).toBe(1)
    expect(data.daily[0].entry_count).toBe(2)
  })

  test("groups entries by date in oldest-first order", async () => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const entries: MoodEntry[] = [
      { id: crypto.randomUUID(), user_email: "alice@co.com", score: 5, note: null, timestamp: yesterday.toISOString() },
      { id: crypto.randomUUID(), user_email: "alice@co.com", score: 1, note: null, timestamp: today.toISOString() },
      { id: crypto.randomUUID(), user_email: "bob@co.com", score: 3, note: null, timestamp: today.toISOString() },
    ]
    await write_moods(entries)

    const result = await app.call("/trends/person", { user_email: "alice@co.com" })
    const data = result.result as { daily: DailyBreakdown[]; total_entries: number }

    expect(data.total_entries).toBe(2)
    expect(data.daily.length).toBe(2)
    expect(data.daily[0].date < data.daily[1].date).toBe(true)
    expect(data.daily[0].average_score).toBe(5)
    expect(data.daily[1].average_score).toBe(1)
  })

  test("excludes moods older than 30 days", async () => {
    const old_date = new Date()
    old_date.setDate(old_date.getDate() - 31)

    const entries: MoodEntry[] = [
      { id: crypto.randomUUID(), user_email: "alice@co.com", score: 1, note: null, timestamp: old_date.toISOString() },
      { id: crypto.randomUUID(), user_email: "alice@co.com", score: 5, note: null, timestamp: new Date().toISOString() },
    ]
    await write_moods(entries)

    const result = await app.call("/trends/person", { user_email: "alice@co.com" })
    const data = result.result as { daily: DailyBreakdown[]; total_entries: number }

    expect(data.total_entries).toBe(1)
    expect(data.daily.length).toBe(1)
    expect(data.daily[0].average_score).toBe(5)
  })
})
