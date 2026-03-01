import { describe, test, expect, beforeEach } from "bun:test"
import app from "../../src/app.ts"
import "../../src/index.ts"
import { clear_bookmarks } from "../../src/lib/store.ts"

describe("/bookmarks/export", () => {
  beforeEach(() => {
    clear_bookmarks()
  })

  test("returns markdown with no-bookmarks message when empty", async () => {
    const result = await app.call("/bookmarks/export")
    expect(result.status).toBe("success")
    const data = result.result as { markdown: string; count: number }
    expect(data.count).toBe(0)
    expect(data.markdown).toContain("# Bookmarks")
    expect(data.markdown).toContain("No bookmarks saved.")
  })

  test("returns count matching number of bookmarks", async () => {
    await app.call("/bookmarks/save", { url: "https://a.com" })
    await app.call("/bookmarks/save", { url: "https://b.com" })

    const result = await app.call("/bookmarks/export")
    expect(result.status).toBe("success")
    const data = result.result as { markdown: string; count: number }
    expect(data.count).toBe(2)
  })

  test("groups bookmarks by tag", async () => {
    await app.call("/bookmarks/save", { url: "https://a.com", tags: ["dev"] })
    await app.call("/bookmarks/save", { url: "https://b.com", tags: ["tools"] })

    const result = await app.call("/bookmarks/export")
    const data = result.result as { markdown: string }
    expect(data.markdown).toContain("## dev")
    expect(data.markdown).toContain("## tools")
  })

  test("untagged bookmarks appear under Untagged section", async () => {
    await app.call("/bookmarks/save", { url: "https://plain.com" })

    const result = await app.call("/bookmarks/export")
    const data = result.result as { markdown: string }
    expect(data.markdown).toContain("## Untagged")
    expect(data.markdown).toContain("https://plain.com")
  })

  test("bookmark with multiple tags appears under each tag", async () => {
    await app.call("/bookmarks/save", { url: "https://multi.com", tags: ["dev", "tools"] })

    const result = await app.call("/bookmarks/export")
    const data = result.result as { markdown: string }
    expect(data.markdown).toContain("## dev")
    expect(data.markdown).toContain("## tools")
    // url appears in both sections
    const dev_section = data.markdown.indexOf("## dev")
    const tools_section = data.markdown.indexOf("## tools")
    const after_dev = data.markdown.indexOf("https://multi.com", dev_section)
    const after_tools = data.markdown.indexOf("https://multi.com", tools_section)
    expect(after_dev).toBeGreaterThan(dev_section)
    expect(after_tools).toBeGreaterThan(tools_section)
  })

  test("uses title as link text when available", async () => {
    await app.call("/bookmarks/save", { url: "https://titled.com", title: "My Page" })

    const result = await app.call("/bookmarks/export")
    const data = result.result as { markdown: string }
    expect(data.markdown).toContain("[My Page](https://titled.com)")
  })

  test("uses url as link text when no title", async () => {
    await app.call("/bookmarks/save", { url: "https://notitled.com" })

    const result = await app.call("/bookmarks/export")
    const data = result.result as { markdown: string }
    expect(data.markdown).toContain("[https://notitled.com](https://notitled.com)")
  })

  test("includes notes as blockquote", async () => {
    await app.call("/bookmarks/save", { url: "https://noted.com", notes: "Important resource" })

    const result = await app.call("/bookmarks/export")
    const data = result.result as { markdown: string }
    expect(data.markdown).toContain("> Important resource")
  })

  test("tag sections are sorted alphabetically with Untagged last", async () => {
    await app.call("/bookmarks/save", { url: "https://z.com", tags: ["zebra"] })
    await app.call("/bookmarks/save", { url: "https://a.com", tags: ["alpha"] })
    await app.call("/bookmarks/save", { url: "https://u.com" })

    const result = await app.call("/bookmarks/export")
    const data = result.result as { markdown: string }
    const alpha_pos = data.markdown.indexOf("## alpha")
    const zebra_pos = data.markdown.indexOf("## zebra")
    const untagged_pos = data.markdown.indexOf("## Untagged")
    expect(alpha_pos).toBeLessThan(zebra_pos)
    expect(zebra_pos).toBeLessThan(untagged_pos)
  })

  test("returns well-formed Result with meta", async () => {
    const result = await app.call("/bookmarks/export")
    expect(result.status).toBe("success")
    expect(result.errors).toBeNull()
    expect(result.meta.path).toBe("/bookmarks/export")
    expect(typeof result.meta.timestamp).toBe("string")
    expect(typeof result.meta.duration_ms).toBe("number")
  })

  test("ignores params gracefully", async () => {
    const result = await app.call("/bookmarks/export", { unexpected: "value" })
    expect(result.status).toBe("success")
  })
})
