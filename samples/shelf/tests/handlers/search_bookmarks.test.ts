import { describe, test, expect, beforeEach } from "bun:test"
import app from "../../src/app.ts"
import "../../src/index.ts"
import { clear_bookmarks } from "../../src/lib/store.ts"
import type { Bookmark } from "../../src/lib/types.ts"

type ListResult = { bookmarks: Bookmark[]; count: number }

async function seed() {
  await app.call("/bookmarks/save", { url: "https://bun.sh", title: "Bun runtime", tags: ["dev", "javascript"], notes: "fast JS runtime" })
  await app.call("/bookmarks/save", { url: "https://deno.land", title: "Deno", tags: ["dev", "typescript"], notes: "secure runtime" })
  await app.call("/bookmarks/save", { url: "https://recipes.com/cake", title: "Chocolate Cake", tags: ["cooking", "dessert"], notes: "grandma's recipe" })
  await app.call("/bookmarks/save", { url: "https://news.ycombinator.com", title: "Hacker News", tags: ["dev", "news"], notes: null })
}

describe("/bookmarks/list — tag filtering", () => {
  beforeEach(() => {
    clear_bookmarks()
  })

  test("filters by exact tag match", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { tag: "cooking" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(1)
    expect(data.bookmarks[0].url).toBe("https://recipes.com/cake")
  })

  test("returns multiple bookmarks sharing a tag", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { tag: "dev" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(3)
    const urls = data.bookmarks.map(b => b.url)
    expect(urls).toContain("https://bun.sh")
    expect(urls).toContain("https://deno.land")
    expect(urls).toContain("https://news.ycombinator.com")
  })

  test("returns empty when no bookmarks match tag", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { tag: "nonexistent" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(0)
    expect(data.bookmarks).toEqual([])
  })

  test("tag match is exact — does not match substrings", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { tag: "java" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(0)
  })

  test("tag match is case-sensitive", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { tag: "Dev" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(0)
  })
})

describe("/bookmarks/list — full-text search (q)", () => {
  beforeEach(() => {
    clear_bookmarks()
  })

  test("searches across url", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { q: "bun.sh" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(1)
    expect(data.bookmarks[0].url).toBe("https://bun.sh")
  })

  test("searches across title", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { q: "chocolate" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(1)
    expect(data.bookmarks[0].title).toBe("Chocolate Cake")
  })

  test("searches across notes", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { q: "grandma" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(1)
    expect(data.bookmarks[0].url).toBe("https://recipes.com/cake")
  })

  test("searches across tags", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { q: "typescript" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(1)
    expect(data.bookmarks[0].url).toBe("https://deno.land")
  })

  test("search is case-insensitive", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { q: "HACKER" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(1)
    expect(data.bookmarks[0].url).toBe("https://news.ycombinator.com")
  })

  test("returns multiple matches", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { q: "runtime" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(2)
    const urls = data.bookmarks.map(b => b.url)
    expect(urls).toContain("https://bun.sh")
    expect(urls).toContain("https://deno.land")
  })

  test("returns empty when no bookmarks match query", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { q: "zzznomatch" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(0)
    expect(data.bookmarks).toEqual([])
  })
})

describe("/bookmarks/list — combined filters", () => {
  beforeEach(() => {
    clear_bookmarks()
  })

  test("tag + q narrows results (AND logic)", async () => {
    await seed()
    // "dev" tag matches bun, deno, hackernews. "runtime" in notes matches bun, deno.
    // Combined: bun + deno (both have dev tag AND runtime in notes)
    const result = await app.call("/bookmarks/list", { tag: "dev", q: "runtime" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(2)
    const urls = data.bookmarks.map(b => b.url)
    expect(urls).toContain("https://bun.sh")
    expect(urls).toContain("https://deno.land")
  })

  test("tag + q can narrow to single result", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { tag: "javascript", q: "runtime" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(1)
    expect(data.bookmarks[0].url).toBe("https://bun.sh")
  })

  test("tag + q can yield zero results", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { tag: "cooking", q: "runtime" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(0)
  })
})

describe("/bookmarks/list — filter edge cases", () => {
  beforeEach(() => {
    clear_bookmarks()
  })

  test("no params still returns all bookmarks (backward compatible)", async () => {
    await seed()
    const result = await app.call("/bookmarks/list")
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(4)
  })

  test("empty object params returns all bookmarks", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", {})
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(4)
  })

  test("whitespace-only tag is treated as no filter", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { tag: "   " })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(4)
  })

  test("whitespace-only q is treated as no filter", async () => {
    await seed()
    const result = await app.call("/bookmarks/list", { q: "   " })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(4)
  })

  test("non-string tag returns validation error", async () => {
    const result = await app.call("/bookmarks/list", { tag: 123 })
    expect(result.status).toBe("error")
    expect(result.errors).not.toBeNull()
    const errors = result.errors as Record<string, unknown>
    expect(errors.tag).toBeDefined()
  })

  test("non-string q returns validation error", async () => {
    const result = await app.call("/bookmarks/list", { q: ["array"] })
    expect(result.status).toBe("error")
    expect(result.errors).not.toBeNull()
    const errors = result.errors as Record<string, unknown>
    expect(errors.q).toBeDefined()
  })

  test("both invalid tag and q returns multiple errors", async () => {
    const result = await app.call("/bookmarks/list", { tag: 42, q: true })
    expect(result.status).toBe("error")
    const errors = result.errors as Record<string, unknown>
    expect(errors.tag).toBeDefined()
    expect(errors.q).toBeDefined()
  })

  test("results are sorted newest first", async () => {
    await app.call("/bookmarks/save", { url: "https://a.com", tags: ["test"] })
    await new Promise(r => setTimeout(r, 10))
    await app.call("/bookmarks/save", { url: "https://b.com", tags: ["test"] })

    const result = await app.call("/bookmarks/list", { tag: "test" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.bookmarks[0].url).toBe("https://b.com")
    expect(data.bookmarks[1].url).toBe("https://a.com")
  })

  test("search with no bookmarks returns empty", async () => {
    const result = await app.call("/bookmarks/list", { q: "anything" })
    expect(result.status).toBe("success")
    const data = result.result as ListResult
    expect(data.count).toBe(0)
    expect(data.bookmarks).toEqual([])
  })
})
