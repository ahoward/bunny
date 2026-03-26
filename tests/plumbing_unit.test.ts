import { describe, test, expect } from "bun:test"
import { format_compact, format_markdown } from "../src/lib/map.ts"
import { load_constraints } from "../src/lib/state.ts"
import { find_root } from "../src/lib/feature.ts"
import type { CodebaseMap } from "../src/lib/map.ts"

describe("format_compact", () => {
  const map: CodebaseMap = {
    files: [
      { path: "src/index.ts", language: "typescript", imports: ["fs"], symbols: [
        { kind: "function", name: "main", signature: "(argv: string[])", line: 1, children: [] },
      ]},
      { path: "src/lib/utils.ts", language: "typescript", imports: [], symbols: [
        { kind: "function", name: "helper", signature: "()", line: 5, children: [] },
      ]},
      { path: "tests/index.test.ts", language: "typescript", imports: [], symbols: [] },
    ],
    stats: { total_files: 3, by_language: { typescript: 3 } },
  }

  test("returns file paths only, one per line", () => {
    const result = format_compact(map)
    const lines = result.split("\n")
    expect(lines[0]).toBe("3 files")
    expect(lines[1]).toBe("src/index.ts")
    expect(lines[2]).toBe("src/lib/utils.ts")
    expect(lines[3]).toBe("tests/index.test.ts")
    expect(lines.length).toBe(4)
  })

  test("compact is much shorter than full markdown", () => {
    const compact = format_compact(map)
    const full = format_markdown(map)
    expect(compact.length).toBeLessThan(full.length)
  })

  test("empty map returns just count", () => {
    const empty: CodebaseMap = { files: [], stats: { total_files: 0, by_language: {} } }
    expect(format_compact(empty)).toBe("0 files")
  })
})

describe("load_constraints reads guardrails.md", () => {
  test("returns constraints from the real project", () => {
    const root = find_root()
    const constraints = load_constraints(root)
    // bny/guardrails.md exists and has bullet points
    expect(constraints.length).toBeGreaterThan(0)
  })
})
