import { describe, test, expect, beforeEach } from "bun:test"
import app from "../../src/app.ts"
import "../../src/index.ts"
import { clear_bookmarks } from "../../src/lib/store.ts"

describe("/bookmarks/save", () => {
  beforeEach(() => {
    clear_bookmarks()
  })

  test("saves a bookmark with valid url", async () => {
    const result = await app.call("/bookmarks/save", { url: "https://example.com" })
    expect(result.status).toBe("success")
    expect(result.errors).toBeNull()
    const data = result.result as { created: { id: string; url: string; tags: string[]; title: string | null; notes: string | null; created_at: string } }
    expect(data.created.url).toBe("https://example.com")
    expect(typeof data.created.id).toBe("string")
    expect(typeof data.created.created_at).toBe("string")
    expect(data.created.tags).toEqual([])
    expect(data.created.title).toBeNull()
    expect(data.created.notes).toBeNull()
  })

  test("saves with tags, title, and notes", async () => {
    const result = await app.call("/bookmarks/save", {
      url: "https://example.com",
      tags: ["dev", "tools"],
      title: "Example Site",
      notes: "A great resource"
    })
    expect(result.status).toBe("success")
    const data = result.result as { created: { tags: string[]; title: string; notes: string } }
    expect(data.created.tags).toEqual(["dev", "tools"])
    expect(data.created.title).toBe("Example Site")
    expect(data.created.notes).toBe("A great resource")
  })

  test("rejects missing params", async () => {
    const result = await app.call("/bookmarks/save", null)
    expect(result.status).toBe("error")
    expect(result.errors).not.toBeNull()
  })

  test("rejects missing url", async () => {
    const result = await app.call("/bookmarks/save", {})
    expect(result.status).toBe("error")
    expect(result.errors!.url).toBeTruthy()
  })

  test("rejects empty string url", async () => {
    const result = await app.call("/bookmarks/save", { url: "" })
    expect(result.status).toBe("error")
    expect(result.errors!.url).toBeTruthy()
  })

  test("rejects whitespace-only url", async () => {
    const result = await app.call("/bookmarks/save", { url: "   " })
    expect(result.status).toBe("error")
    expect(result.errors!.url).toBeTruthy()
  })

  test("rejects non-string url", async () => {
    const result = await app.call("/bookmarks/save", { url: 123 })
    expect(result.status).toBe("error")
    expect(result.errors!.url).toBeTruthy()
  })

  test("rejects non-array tags", async () => {
    const result = await app.call("/bookmarks/save", { url: "https://x.com", tags: "dev" })
    expect(result.status).toBe("error")
    expect(result.errors!.tags).toBeTruthy()
  })

  test("rejects tags with non-string elements", async () => {
    const result = await app.call("/bookmarks/save", { url: "https://x.com", tags: [1, 2] })
    expect(result.status).toBe("error")
    expect(result.errors!.tags).toBeTruthy()
  })

  test("filters empty tags after trimming", async () => {
    const result = await app.call("/bookmarks/save", { url: "https://x.com", tags: ["dev", "  ", ""] })
    expect(result.status).toBe("success")
    const data = result.result as { created: { tags: string[] } }
    expect(data.created.tags).toEqual(["dev"])
  })

  test("trims tag whitespace", async () => {
    const result = await app.call("/bookmarks/save", { url: "https://x.com", tags: ["  dev  ", " tools "] })
    expect(result.status).toBe("success")
    const data = result.result as { created: { tags: string[] } }
    expect(data.created.tags).toEqual(["dev", "tools"])
  })

  test("stores whitespace-only title as null", async () => {
    const result = await app.call("/bookmarks/save", { url: "https://x.com", title: "   " })
    expect(result.status).toBe("success")
    const data = result.result as { created: { title: string | null } }
    expect(data.created.title).toBeNull()
  })

  test("stores whitespace-only notes as null", async () => {
    const result = await app.call("/bookmarks/save", { url: "https://x.com", notes: "   " })
    expect(result.status).toBe("success")
    const data = result.result as { created: { notes: string | null } }
    expect(data.created.notes).toBeNull()
  })

  test("trims title whitespace", async () => {
    const result = await app.call("/bookmarks/save", { url: "https://x.com", title: "  My Title  " })
    expect(result.status).toBe("success")
    const data = result.result as { created: { title: string } }
    expect(data.created.title).toBe("My Title")
  })

  test("rejects non-string title", async () => {
    const result = await app.call("/bookmarks/save", { url: "https://x.com", title: 42 })
    expect(result.status).toBe("error")
    expect(result.errors!.title).toBeTruthy()
  })

  test("rejects non-string notes", async () => {
    const result = await app.call("/bookmarks/save", { url: "https://x.com", notes: true })
    expect(result.status).toBe("error")
    expect(result.errors!.notes).toBeTruthy()
  })

  test("reports multiple validation errors at once", async () => {
    const result = await app.call("/bookmarks/save", { tags: "not-array", title: 42 })
    expect(result.status).toBe("error")
    expect(result.errors!.url).toBeTruthy()
    expect(result.errors!.tags).toBeTruthy()
    expect(result.errors!.title).toBeTruthy()
  })
})
