import { describe, test, expect, beforeEach } from "bun:test"
import app from "../../src/app.ts"
import "../../src/index.ts"
import { clear_bookmarks } from "../../src/lib/store.ts"

describe("/bookmarks/delete", () => {
  beforeEach(() => {
    clear_bookmarks()
  })

  test("deletes an existing bookmark", async () => {
    const save_result = await app.call("/bookmarks/save", { url: "https://example.com" })
    const id = (save_result.result as { created: { id: string } }).created.id

    const result = await app.call("/bookmarks/delete", { id })
    expect(result.status).toBe("success")
    const data = result.result as { deleted: { id: string; url: string } }
    expect(data.deleted.id).toBe(id)
    expect(data.deleted.url).toBe("https://example.com")

    const list = await app.call("/bookmarks/list")
    const list_data = list.result as { count: number }
    expect(list_data.count).toBe(0)
  })

  test("rejects missing params", async () => {
    const result = await app.call("/bookmarks/delete", null)
    expect(result.status).toBe("error")
    expect(result.errors).not.toBeNull()
  })

  test("rejects missing id", async () => {
    const result = await app.call("/bookmarks/delete", {})
    expect(result.status).toBe("error")
    expect(result.errors!.id).toBeTruthy()
  })

  test("rejects empty string id", async () => {
    const result = await app.call("/bookmarks/delete", { id: "" })
    expect(result.status).toBe("error")
    expect(result.errors!.id).toBeTruthy()
  })

  test("rejects whitespace-only id", async () => {
    const result = await app.call("/bookmarks/delete", { id: "   " })
    expect(result.status).toBe("error")
    expect(result.errors!.id).toBeTruthy()
  })

  test("returns error for non-existent bookmark", async () => {
    const result = await app.call("/bookmarks/delete", { id: "does-not-exist" })
    expect(result.status).toBe("error")
    expect(result.errors!.id).toBeTruthy()
  })

  test("rejects non-string id", async () => {
    const result = await app.call("/bookmarks/delete", { id: 123 })
    expect(result.status).toBe("error")
    expect(result.errors!.id).toBeTruthy()
  })
})
