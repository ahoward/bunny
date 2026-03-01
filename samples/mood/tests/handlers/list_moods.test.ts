import { describe, test, expect, beforeEach } from "bun:test"
import app from "../../src/app.ts"
import "../../src/index.ts"
import { clear_moods } from "../../src/lib/store.ts"

describe("GET /moods/list", () => {
  beforeEach(async () => {
    await clear_moods()
  })

  test("returns empty array when no moods exist", async () => {
    const result = await app.call("/moods/list")
    expect(result.status).toBe("success")
    const data = result.result as { moods: unknown[]; count: number }
    expect(data.moods).toEqual([])
    expect(data.count).toBe(0)
  })

  test("returns all moods", async () => {
    await app.call("/moods/create", { user_email: "alice@co.com", score: 4 })
    await app.call("/moods/create", { user_email: "bob@co.com", score: 2 })

    const result = await app.call("/moods/list")
    expect(result.status).toBe("success")
    const data = result.result as { moods: unknown[]; count: number }
    expect(data.count).toBe(2)
    expect(data.moods.length).toBe(2)
  })

  test("filters by user_email", async () => {
    await app.call("/moods/create", { user_email: "alice@co.com", score: 4 })
    await app.call("/moods/create", { user_email: "bob@co.com", score: 2 })
    await app.call("/moods/create", { user_email: "alice@co.com", score: 5 })

    const result = await app.call("/moods/list", { user_email: "alice@co.com" })
    expect(result.status).toBe("success")
    const data = result.result as { moods: { user_email: string }[]; count: number }
    expect(data.count).toBe(2)
    expect(data.moods.every(m => m.user_email === "alice@co.com")).toBe(true)
  })

  test("returns moods sorted newest first", async () => {
    await app.call("/moods/create", { user_email: "alice@co.com", score: 1 })
    // small delay to ensure different timestamps
    await new Promise(r => setTimeout(r, 10))
    await app.call("/moods/create", { user_email: "alice@co.com", score: 5 })

    const result = await app.call("/moods/list")
    expect(result.status).toBe("success")
    const data = result.result as { moods: { score: number; timestamp: string }[] }
    expect(data.moods[0].score).toBe(5)
    expect(data.moods[1].score).toBe(1)
  })
})
