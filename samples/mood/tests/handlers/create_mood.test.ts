import { describe, test, expect, beforeEach } from "bun:test"
import app from "../../src/app.ts"
import "../../src/index.ts"
import { clear_moods } from "../../src/lib/store.ts"

describe("POST /moods/create", () => {
  beforeEach(async () => {
    await clear_moods()
  })

  test("creates a mood entry with valid input", async () => {
    const result = await app.call("/moods/create", {
      user_email: "alice@co.com",
      score: 4,
      note: "good day"
    })

    expect(result.status).toBe("success")
    expect(result.errors).toBeNull()

    const data = result.result as { created: { id: string; user_email: string; score: number; note: string; timestamp: string } }
    expect(data.created.user_email).toBe("alice@co.com")
    expect(data.created.score).toBe(4)
    expect(data.created.note).toBe("good day")
    expect(typeof data.created.id).toBe("string")
    expect(typeof data.created.timestamp).toBe("string")
  })

  test("creates a mood entry without a note", async () => {
    const result = await app.call("/moods/create", {
      user_email: "bob@co.com",
      score: 2
    })

    expect(result.status).toBe("success")
    const data = result.result as { created: { note: string | null } }
    expect(data.created.note).toBeNull()
  })

  test("rejects missing params", async () => {
    const result = await app.call("/moods/create", null)
    expect(result.status).toBe("error")
    expect(result.errors).not.toBeNull()
  })

  test("rejects missing user_email", async () => {
    const result = await app.call("/moods/create", { score: 3 })
    expect(result.status).toBe("error")
    expect(result.errors!.user_email).toBeTruthy()
  })

  test("rejects missing score", async () => {
    const result = await app.call("/moods/create", { user_email: "alice@co.com" })
    expect(result.status).toBe("error")
    expect(result.errors!.score).toBeTruthy()
  })

  test("rejects score below 1", async () => {
    const result = await app.call("/moods/create", { user_email: "a@b.com", score: 0 })
    expect(result.status).toBe("error")
    expect(result.errors!.score).toBeTruthy()
  })

  test("rejects score above 5", async () => {
    const result = await app.call("/moods/create", { user_email: "a@b.com", score: 6 })
    expect(result.status).toBe("error")
    expect(result.errors!.score).toBeTruthy()
  })

  test("rejects non-integer score", async () => {
    const result = await app.call("/moods/create", { user_email: "a@b.com", score: 3.5 })
    expect(result.status).toBe("error")
    expect(result.errors!.score).toBeTruthy()
  })

  test("rejects string score", async () => {
    const result = await app.call("/moods/create", { user_email: "a@b.com", score: "happy" })
    expect(result.status).toBe("error")
    expect(result.errors!.score).toBeTruthy()
  })

  test("reports multiple validation errors at once", async () => {
    const result = await app.call("/moods/create", {})
    expect(result.status).toBe("error")
    expect(result.errors!.user_email).toBeTruthy()
    expect(result.errors!.score).toBeTruthy()
  })

  test("rejects whitespace-only user_email", async () => {
    const result = await app.call("/moods/create", { user_email: "   ", score: 3 })
    expect(result.status).toBe("error")
    expect(result.errors!.user_email).toBeTruthy()
  })

  test("trims user_email whitespace", async () => {
    const result = await app.call("/moods/create", { user_email: "  alice@co.com  ", score: 3 })
    expect(result.status).toBe("success")
    const data = result.result as { created: { user_email: string } }
    expect(data.created.user_email).toBe("alice@co.com")
  })

  test("stores whitespace-only note as null", async () => {
    const result = await app.call("/moods/create", { user_email: "a@b.com", score: 3, note: "   " })
    expect(result.status).toBe("success")
    const data = result.result as { created: { note: string | null } }
    expect(data.created.note).toBeNull()
  })

  test("trims note whitespace", async () => {
    const result = await app.call("/moods/create", { user_email: "a@b.com", score: 3, note: "  good day  " })
    expect(result.status).toBe("success")
    const data = result.result as { created: { note: string | null } }
    expect(data.created.note).toBe("good day")
  })

  test("rejects boolean score", async () => {
    const result = await app.call("/moods/create", { user_email: "a@b.com", score: true })
    expect(result.status).toBe("error")
    expect(result.errors!.score).toBeTruthy()
  })

  test("rejects NaN score", async () => {
    const result = await app.call("/moods/create", { user_email: "a@b.com", score: NaN })
    expect(result.status).toBe("error")
    expect(result.errors!.score).toBeTruthy()
  })

  test("rejects Infinity score", async () => {
    const result = await app.call("/moods/create", { user_email: "a@b.com", score: Infinity })
    expect(result.status).toBe("error")
    expect(result.errors!.score).toBeTruthy()
  })
})
