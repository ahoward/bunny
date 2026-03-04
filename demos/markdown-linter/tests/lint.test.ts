import { describe, test, expect } from "bun:test"
import { lint } from "../src/lint"
import { all_rules } from "../src/rules/index"
import type { Rule } from "../src/types"

describe("lint", () => {
  test("clean file produces no diagnostics", () => {
    const result = lint("clean.md", "# Hello\n\nWorld\n", all_rules)
    expect(result).toEqual([])
  })

  test("collects diagnostics from multiple rules", () => {
    const result = lint("bad.md", "# Hello   \n\n\n\nWorld", all_rules)
    expect(result.length).toBeGreaterThan(0)
    const rules = new Set(result.map((d) => d.rule))
    expect(rules.size).toBeGreaterThan(1)
  })

  test("diagnostics are sorted by line then column", () => {
    const result = lint("bad.md", "a   \nb   \n", all_rules)
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]
      const curr = result[i]
      expect(prev.line <= curr.line).toBe(true)
      if (prev.line === curr.line) {
        expect(prev.column <= curr.column).toBe(true)
      }
    }
  })

  test("crashing rule produces error diagnostic instead of throwing", () => {
    const bad_rule: Rule = {
      name: "crasher",
      kind: "line",
      check() {
        throw new Error("boom")
      },
    }
    const result = lint("test.md", "hello\n", [bad_rule])
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe("error")
    expect(result[0].message).toContain("boom")
  })
})
