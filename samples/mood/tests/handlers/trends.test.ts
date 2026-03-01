import { describe, test, expect, beforeEach } from "bun:test"
import app from "../../src/app.ts"
import "../../src/index.ts"
import { clear_moods, write_moods } from "../../src/lib/store.ts"
import type { MoodEntry } from "../../src/lib/types.ts"

describe("GET /trends", () => {
  beforeEach(async () => {
    await clear_moods()
  })

  test("returns empty trends when no moods exist", async () => {
    const result = await app.call("/trends")
    expect(result.status).toBe("success")
    const data = result.result as { per_user: unknown[]; team_average: null; total_entries: number }
    expect(data.per_user).toEqual([])
    expect(data.team_average).toBeNull()
    expect(data.total_entries).toBe(0)
  })

  test("returns per-user and team averages", async () => {
    await app.call("/moods/create", { user_email: "alice@co.com", score: 4 })
    await app.call("/moods/create", { user_email: "alice@co.com", score: 2 })
    await app.call("/moods/create", { user_email: "bob@co.com", score: 5 })

    const result = await app.call("/trends")
    expect(result.status).toBe("success")

    const data = result.result as {
      per_user: { user_email: string; average_score: number; entry_count: number }[]
      team_average: number
      total_entries: number
      period_days: number
    }

    expect(data.total_entries).toBe(3)
    expect(data.period_days).toBe(30)
    expect(typeof data.team_average).toBe("number")

    const alice = data.per_user.find(t => t.user_email === "alice@co.com")
    expect(alice).toBeTruthy()
    expect(alice!.average_score).toBe(3)
    expect(alice!.entry_count).toBe(2)

    const bob = data.per_user.find(t => t.user_email === "bob@co.com")
    expect(bob).toBeTruthy()
    expect(bob!.average_score).toBe(5)
    expect(bob!.entry_count).toBe(1)
  })

  test("filters trends by user_email", async () => {
    await app.call("/moods/create", { user_email: "alice@co.com", score: 4 })
    await app.call("/moods/create", { user_email: "bob@co.com", score: 5 })

    const result = await app.call("/trends", { user_email: "alice@co.com" })
    expect(result.status).toBe("success")

    const data = result.result as { per_user: { user_email: string }[]; total_entries: number }
    expect(data.total_entries).toBe(1)
    expect(data.per_user.length).toBe(1)
    expect(data.per_user[0].user_email).toBe("alice@co.com")
  })

  test("excludes moods older than 30 days", async () => {
    const old_date = new Date()
    old_date.setDate(old_date.getDate() - 31)

    const old_entry: MoodEntry = {
      id: crypto.randomUUID(),
      user_email: "old@co.com",
      score: 1,
      note: null,
      timestamp: old_date.toISOString()
    }
    const recent_entry: MoodEntry = {
      id: crypto.randomUUID(),
      user_email: "new@co.com",
      score: 5,
      note: null,
      timestamp: new Date().toISOString()
    }
    await write_moods([old_entry, recent_entry])

    const result = await app.call("/trends")
    expect(result.status).toBe("success")

    const data = result.result as { per_user: { user_email: string }[]; total_entries: number }
    expect(data.total_entries).toBe(1)
    expect(data.per_user.length).toBe(1)
    expect(data.per_user[0].user_email).toBe("new@co.com")
  })
})
