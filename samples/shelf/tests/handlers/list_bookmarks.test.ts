import { describe, test, expect, beforeEach } from "bun:test"
import app from "../../src/app.ts"
import "../../src/index.ts"
import { clear_bookmarks } from "../../src/lib/store.ts"

describe("/bookmarks/list", () => {
  beforeEach(() => {
    clear_bookmarks()
  })

  test("returns empty array when no bookmarks exist", async () => {
    const result = await app.call("/bookmarks/list")
    expect(result.status).toBe("success")
    const data = result.result as { bookmarks: unknown[]; count: number }
    expect(data.bookmarks).toEqual([])
    expect(data.count).toBe(0)
  })

  test("returns all bookmarks", async () => {
    await app.call("/bookmarks/save", { url: "https://a.com" })
    await app.call("/bookmarks/save", { url: "https://b.com" })

    const result = await app.call("/bookmarks/list")
    expect(result.status).toBe("success")
    const data = result.result as { bookmarks: unknown[]; count: number }
    expect(data.count).toBe(2)
    expect(data.bookmarks.length).toBe(2)
  })

  test("returns bookmarks sorted newest first", async () => {
    await app.call("/bookmarks/save", { url: "https://first.com" })
    await new Promise(r => setTimeout(r, 10))
    await app.call("/bookmarks/save", { url: "https://second.com" })

    const result = await app.call("/bookmarks/list")
    expect(result.status).toBe("success")
    const data = result.result as { bookmarks: { url: string }[] }
    expect(data.bookmarks[0].url).toBe("https://second.com")
    expect(data.bookmarks[1].url).toBe("https://first.com")
  })

  test("bookmarks include tags", async () => {
    await app.call("/bookmarks/save", { url: "https://x.com", tags: ["dev", "tools"] })

    const result = await app.call("/bookmarks/list")
    expect(result.status).toBe("success")
    const data = result.result as { bookmarks: { tags: string[] }[] }
    expect(data.bookmarks[0].tags).toEqual(["dev", "tools"])
  })
})
