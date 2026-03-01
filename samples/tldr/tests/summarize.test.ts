import { describe, test, expect, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { resolve } from "node:path"
import { writeFileSync, unlinkSync, existsSync, rmSync } from "node:fs"
import app from "../src/app.ts"
import "../src/index.ts"
import { content_hash, cache_dir, cache_set, cache_get } from "../src/lib/cache.ts"

// mock the Anthropic SDK at module level
const mock_create = mock(() => Promise.resolve({
  content: [{ type: "text", text: "This is a test summary of the file." }],
  model: "claude-sonnet-4-20250514",
  usage: { input_tokens: 50, output_tokens: 20 }
}))

mock.module("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = { create: mock_create }
  }
}))

const FIXTURE_DIR = resolve("tests/fixtures/summarize")
const SAMPLE_FILE = resolve(FIXTURE_DIR, "sample.txt")

describe("/summarize", () => {
  const original_key = process.env.ANTHROPIC_API_KEY
  const original_fetch = globalThis.fetch

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key-123"
    mock_create.mockClear()
    globalThis.fetch = original_fetch
  })

  afterEach(() => {
    if (original_key !== undefined) {
      process.env.ANTHROPIC_API_KEY = original_key
    } else {
      delete process.env.ANTHROPIC_API_KEY
    }
    globalThis.fetch = original_fetch
  })

  // -- file_path tests (existing) --

  test("returns error when params is null", async () => {
    const result = await app.call("/summarize", null)
    expect(result.status).toBe("error")
    expect(result.errors).not.toBeNull()
  })

  test("returns error when no input source provided", async () => {
    const result = await app.call("/summarize", {})
    expect(result.status).toBe("error")
    expect(result.errors!.input).toBeDefined()
  })

  test("returns error when file_path is empty string", async () => {
    const result = await app.call("/summarize", { file_path: "" })
    expect(result.status).toBe("error")
    expect(result.errors!.input).toBeDefined()
  })

  test("returns error when file does not exist", async () => {
    const result = await app.call("/summarize", { file_path: "/nonexistent/file.txt" })
    expect(result.status).toBe("error")
    expect(result.errors!.file_path).toBeDefined()
  })

  test("returns error when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY
    const result = await app.call("/summarize", { file_path: SAMPLE_FILE })
    expect(result.status).toBe("error")
    expect(result.errors!.api).toBeDefined()
  })

  test("returns success with summary for valid file", async () => {
    const result = await app.call("/summarize", { file_path: SAMPLE_FILE })
    expect(result.status).toBe("success")
    expect(result.errors).toBeNull()
    const data = result.result as Record<string, unknown>
    expect(typeof data.summary).toBe("string")
    expect((data.summary as string).length).toBeGreaterThan(0)
    expect(data.source).toBe(SAMPLE_FILE)
    expect(typeof data.tokens_in).toBe("number")
    expect(typeof data.tokens_out).toBe("number")
  })

  test("returns error for empty file", async () => {
    const empty_path = resolve(FIXTURE_DIR, "empty.txt")
    writeFileSync(empty_path, "")
    try {
      const result = await app.call("/summarize", { file_path: empty_path })
      expect(result.status).toBe("error")
      expect(result.errors!.file_path).toBeDefined()
    } finally {
      unlinkSync(empty_path)
    }
  })

  test("result has correct meta shape", async () => {
    const result = await app.call("/summarize", { file_path: SAMPLE_FILE })
    expect(result.status).toBe("success")
    expect(result.meta.path).toBe("/summarize")
    expect(typeof result.meta.timestamp).toBe("string")
    expect(typeof result.meta.duration_ms).toBe("number")
  })

  // -- url tests --

  test("returns success with summary for valid URL", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response("Some web page content to summarize."))) as unknown as typeof fetch
    const result = await app.call("/summarize", { url: "https://example.com/page.txt" })
    expect(result.status).toBe("success")
    expect(result.errors).toBeNull()
    const data = result.result as Record<string, unknown>
    expect(typeof data.summary).toBe("string")
    expect(data.source).toBe("https://example.com/page.txt")
  })

  test("returns error for invalid URL format", async () => {
    const result = await app.call("/summarize", { url: "not-a-url" })
    expect(result.status).toBe("error")
    expect(result.errors!.url).toBeDefined()
  })

  test("returns error when URL fetch fails (non-ok status)", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response("Not Found", { status: 404, statusText: "Not Found" }))) as unknown as typeof fetch
    const result = await app.call("/summarize", { url: "https://example.com/missing" })
    expect(result.status).toBe("error")
    expect(result.errors!.url).toBeDefined()
  })

  test("returns error when URL fetch throws (network error)", async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error("network error"))) as unknown as typeof fetch
    const result = await app.call("/summarize", { url: "https://example.com/down" })
    expect(result.status).toBe("error")
    expect(result.errors!.url).toBeDefined()
  })

  test("returns error when URL returns empty content", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(""))) as unknown as typeof fetch
    const result = await app.call("/summarize", { url: "https://example.com/empty" })
    expect(result.status).toBe("error")
    expect(result.errors!.url).toBeDefined()
  })

  // -- content (stdin) tests --

  test("returns success with summary for content param", async () => {
    const result = await app.call("/summarize", { content: "This is some text to summarize from stdin." })
    expect(result.status).toBe("success")
    expect(result.errors).toBeNull()
    const data = result.result as Record<string, unknown>
    expect(typeof data.summary).toBe("string")
    expect(data.source).toBe("stdin")
  })

  test("returns error when content is empty", async () => {
    const result = await app.call("/summarize", { content: "" })
    expect(result.status).toBe("error")
    expect(result.errors!.input).toBeDefined()
  })

  test("returns error when content is whitespace only", async () => {
    const result = await app.call("/summarize", { content: "   \n  " })
    expect(result.status).toBe("error")
    expect(result.errors!.content).toBeDefined()
  })

  test("uses custom source label when provided with content", async () => {
    const result = await app.call("/summarize", { content: "Some piped text.", source: "pipe" })
    expect(result.status).toBe("success")
    const data = result.result as Record<string, unknown>
    expect(data.source).toBe("pipe")
  })

  // -- multiple input sources --

  test("returns error when multiple input sources provided", async () => {
    const result = await app.call("/summarize", { file_path: SAMPLE_FILE, url: "https://example.com" })
    expect(result.status).toBe("error")
    expect(result.errors!.input).toBeDefined()
  })

  // -- caching tests --

  test("success result includes cached: false on first call", async () => {
    // clear any cached entry for the sample file
    const sample_text = await Bun.file(SAMPLE_FILE).text()
    const hash = content_hash(sample_text)
    const cache_path = resolve(cache_dir(), `${hash}.json`)
    if (existsSync(cache_path)) unlinkSync(cache_path)

    const result = await app.call("/summarize", { file_path: SAMPLE_FILE })
    expect(result.status).toBe("success")
    const data = result.result as Record<string, unknown>
    expect(data.cached).toBe(false)
    expect(mock_create).toHaveBeenCalled()

    // cleanup
    if (existsSync(cache_path)) unlinkSync(cache_path)
  })

  test("returns cached result on second call without calling API", async () => {
    // clear cache, then call once to populate it
    const sample_text = await Bun.file(SAMPLE_FILE).text()
    const hash = content_hash(sample_text)
    const cache_path = resolve(cache_dir(), `${hash}.json`)
    if (existsSync(cache_path)) unlinkSync(cache_path)

    await app.call("/summarize", { file_path: SAMPLE_FILE })
    mock_create.mockClear()

    // second call should hit cache
    const result = await app.call("/summarize", { file_path: SAMPLE_FILE })
    expect(result.status).toBe("success")
    const data = result.result as Record<string, unknown>
    expect(data.cached).toBe(true)
    expect(data.summary).toBe("This is a test summary of the file.")
    expect(mock_create).not.toHaveBeenCalled()

    // cleanup
    if (existsSync(cache_path)) unlinkSync(cache_path)
  })

  test("no_cache bypasses cache and calls API", async () => {
    // pre-populate cache
    const sample_text = await Bun.file(SAMPLE_FILE).text()
    const hash = content_hash(sample_text)
    cache_set(hash, { summary: "cached summary", model: "cached-model", tokens_in: 1, tokens_out: 1 })

    mock_create.mockClear()
    const result = await app.call("/summarize", { file_path: SAMPLE_FILE, no_cache: true })
    expect(result.status).toBe("success")
    const data = result.result as Record<string, unknown>
    expect(data.cached).toBe(false)
    expect(data.summary).toBe("This is a test summary of the file.")
    expect(mock_create).toHaveBeenCalled()

    // cleanup
    const cache_path = resolve(cache_dir(), `${hash}.json`)
    if (existsSync(cache_path)) unlinkSync(cache_path)
  })

  test("cache works for content param (stdin)", async () => {
    const text = "Cache test content from stdin."
    const hash = content_hash(text)
    const cache_path = resolve(cache_dir(), `${hash}.json`)
    if (existsSync(cache_path)) unlinkSync(cache_path)

    // first call populates cache
    await app.call("/summarize", { content: text })
    mock_create.mockClear()

    // second call hits cache
    const result = await app.call("/summarize", { content: text })
    expect(result.status).toBe("success")
    const data = result.result as Record<string, unknown>
    expect(data.cached).toBe(true)
    expect(mock_create).not.toHaveBeenCalled()

    // cleanup
    if (existsSync(cache_path)) unlinkSync(cache_path)
  })

  test("content_hash produces consistent hex string", () => {
    const hash1 = content_hash("hello world")
    const hash2 = content_hash("hello world")
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/)
  })

  test("cache_get returns null for missing entry", () => {
    const result = cache_get("0000000000000000000000000000000000000000000000000000000000000000")
    expect(result).toBeNull()
  })
})
