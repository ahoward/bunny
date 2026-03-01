//
// summarize.ts - core summarizer handler
//
// accepts a file path, URL, or raw content and sends to Claude API
// for a concise summary. exactly one input source must be provided.
//

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import Anthropic from "@anthropic-ai/sdk"
import type { Params, Emit, Result } from "../lib/types.ts"
import { success, error, required, invalid } from "../lib/result.ts"
import { content_hash, cache_get, cache_set } from "../lib/cache.ts"

const SYSTEM_PROMPT = `You are a concise summarizer. Given the contents of a file, produce a short, clear summary. Focus on what the file does, its key points, and any important details. Keep it under 5 sentences unless the content is very complex. Output plain text only — no markdown headers or bullet points.`

const MAX_FILE_SIZE = 1_000_000 // 1MB

export async function handler(params: Params, _emit?: Emit): Promise<Result> {
  // guard: params must be an object
  if (params === null || params === undefined || typeof params !== "object") {
    return error({ input: [required("input")] })
  }

  const p = params as Record<string, unknown>
  const file_path = p.file_path
  const url = p.url
  const content = p.content
  const no_cache = p.no_cache === true

  // determine which input source is provided
  // empty strings are absent; whitespace-only content is present but invalid
  const has_file_path = typeof file_path === "string" && file_path.trim() !== ""
  const has_url = typeof url === "string" && url.trim() !== ""
  const has_content = typeof content === "string" && content !== ""

  const source_count = [has_file_path, has_url, has_content].filter(Boolean).length

  if (source_count === 0) {
    return error({ input: [{ code: "required", message: "one of file_path, url, or content is required" }] })
  }

  if (source_count > 1) {
    return error({ input: [{ code: "invalid", message: "provide exactly one of file_path, url, or content" }] })
  }

  let text: string
  let source_label: string

  if (has_file_path) {
    // -- file path source --
    const abs_path = resolve(file_path as string)

    if (!existsSync(abs_path)) {
      return error({ file_path: [invalid("file_path", `file not found: ${abs_path}`)] })
    }

    const stat = await Bun.file(abs_path).stat()
    if (stat && stat.size > MAX_FILE_SIZE) {
      return error({ file_path: [invalid("file_path", `file too large: ${stat.size} bytes (max ${MAX_FILE_SIZE})`)] })
    }

    text = await readFile(abs_path, "utf-8")

    if (text.trim() === "") {
      return error({ file_path: [invalid("file_path", "file is empty")] })
    }

    source_label = abs_path

  } else if (has_url) {
    // -- URL source --
    const url_str = url as string

    if (!url_str.startsWith("http://") && !url_str.startsWith("https://")) {
      return error({ url: [invalid("url", "must start with http:// or https://")] })
    }

    try {
      new URL(url_str)
    } catch {
      return error({ url: [invalid("url", "invalid URL format")] })
    }

    try {
      const response = await fetch(url_str)
      if (!response.ok) {
        return error({ url: [invalid("url", `fetch failed: ${response.status} ${response.statusText}`)] })
      }
      text = await response.text()
    } catch (err) {
      return error({ url: [{ code: "fetch_error", message: `failed to fetch URL: ${err instanceof Error ? err.message : String(err)}` }] })
    }

    if (text.trim() === "") {
      return error({ url: [invalid("url", "URL returned empty content")] })
    }

    if (text.length > MAX_FILE_SIZE) {
      return error({ url: [invalid("url", `content too large: ${text.length} bytes (max ${MAX_FILE_SIZE})`)] })
    }

    source_label = url_str

  } else {
    // -- content source (stdin) --
    const content_str = content as string

    if (content_str.trim() === "") {
      return error({ content: [invalid("content", "content is empty")] })
    }

    if (content_str.length > MAX_FILE_SIZE) {
      return error({ content: [invalid("content", `content too large: ${content_str.length} bytes (max ${MAX_FILE_SIZE})`)] })
    }

    text = content_str
    source_label = (typeof p.source === "string" && p.source.trim() !== "") ? p.source : "stdin"
  }

  // cache lookup
  const hash = content_hash(text)

  if (!no_cache) {
    const cached = cache_get(hash)
    if (cached) {
      return success({
        ...cached,
        source: source_label,
        cached: true,
      })
    }
  }

  // guard: API key
  const api_key = process.env.ANTHROPIC_API_KEY
  if (!api_key) {
    return error({ api: [{ code: "missing_key", message: "ANTHROPIC_API_KEY environment variable is required" }] })
  }

  const client = new Anthropic({ apiKey: api_key })

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Summarize this:\n\n${text}` }
      ]
    })

    const text_block = response.content.find(b => b.type === "text")
    const summary = text_block ? text_block.text : ""

    const result_data = {
      summary,
      model:      response.model,
      tokens_in:  response.usage.input_tokens,
      tokens_out: response.usage.output_tokens,
    }

    cache_set(hash, result_data)

    return success({
      ...result_data,
      source:     source_label,
      cached:     false,
    })
  } catch (err) {
    return error({
      api: [{
        code:    "api_error",
        message: err instanceof Error ? err.message : String(err)
      }]
    })
  }
}
