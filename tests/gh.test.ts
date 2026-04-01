import { describe, test, expect } from "bun:test"
import {
  ensure_labels,
  find_active_pr,
  read_pr_context,
  type PhaseDetail,
} from "../src/lib/gh.ts"

//
// smoke tests for gh.ts — verifies the module loads, types are correct,
// and the safe-to-call functions don't throw.
//
// we only call functions that won't mutate state on real github:
//   - ensure_labels (idempotent, --force)
//   - find_active_pr (read-only)
//   - read_pr_context (read-only)
//
// we do NOT call create_pipeline_pr, post_phase_comment, close_pipeline_pr,
// mark_stuck etc. in tests because they would hit real github with bogus data.
//

describe("gh.ts", () => {
  describe("module loads and exports", () => {
    test("all exports are the expected types", () => {
      expect(typeof ensure_labels).toBe("function")
      expect(typeof find_active_pr).toBe("function")
      expect(typeof read_pr_context).toBe("function")
    })
  })

  describe("read-only operations", () => {
    test("find_active_pr returns number or null", () => {
      const result = find_active_pr()
      expect(result === null || typeof result === "number").toBe(true)
    })

    test("read_pr_context returns string or null for nonexistent PR", () => {
      const result = read_pr_context(999999999)
      expect(result === null || typeof result === "string").toBe(true)
    })
  })

  describe("ensure_labels is idempotent", () => {
    test("does not throw", () => {
      expect(() => ensure_labels()).not.toThrow()
    }, 15_000) // 12 sequential gh API calls, ~500ms each
  })

  describe("PhaseDetail type", () => {
    test("accepts completed phase", () => {
      const d: PhaseDetail = {
        phase: "build",
        status: "completed",
        duration_ms: 5000,
        artifacts: ["src/main.ts"],
        summary: "built successfully",
        error: null,
      }
      expect(d.status).toBe("completed")
      expect(d.error).toBeNull()
    })

    test("accepts failed phase with error", () => {
      const d: PhaseDetail = {
        phase: "test",
        status: "failed",
        duration_ms: 2000,
        artifacts: [],
        summary: "",
        error: "tests failed: 3 failures",
      }
      expect(d.status).toBe("failed")
      expect(d.error).toContain("3 failures")
    })
  })
})
