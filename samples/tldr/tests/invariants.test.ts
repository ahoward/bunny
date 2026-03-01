import { describe, test, expect } from "bun:test"
import app from "../src/app.ts"
import "../src/index.ts"

describe("invariants", () => {
  test("app.paths() returns at least one path", () => {
    expect(app.paths().length).toBeGreaterThan(0)
  })

  test("every registered path returns a well-formed Result", async () => {
    for (const path of app.paths()) {
      const result = await app.call(path)
      expect(result).toHaveProperty("status")
      expect(result).toHaveProperty("result")
      expect(result).toHaveProperty("errors")
      expect(result).toHaveProperty("meta")
      expect(["success", "error"]).toContain(result.status)
    }
  })

  test("no handler throws", async () => {
    for (const path of app.paths()) {
      const result = await app.call(path)
      if (result.status === "error" && result.errors) {
        const handler_errors = result.errors.handler as Array<{ code: string }> | undefined
        if (handler_errors) {
          expect(handler_errors[0]?.code).not.toBe("exception")
        }
      }
    }
  })

  test("all handler files export a handler function", async () => {
    const glob = new Bun.Glob("src/handlers/**/*.ts")
    for await (const path of glob.scan(".")) {
      const mod = await import(`../${path}`)
      expect(typeof mod.handler).toBe("function")
    }
  })

  test("unknown path returns error, not exception", async () => {
    const result = await app.call("/nonexistent")
    expect(result.status).toBe("error")
    expect(result.result).toBeNull()
    expect(result.errors).not.toBeNull()
  })

  test("/ping result has correct meta shape", async () => {
    const result = await app.call("/ping")
    expect(result.status).toBe("success")
    expect(result.errors).toBeNull()
    expect(result.result).not.toBeNull()
    expect(result.meta.path).toBe("/ping")
    expect(typeof result.meta.timestamp).toBe("string")
    expect(typeof result.meta.duration_ms).toBe("number")
  })
})
