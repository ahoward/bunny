import { describe, test, expect } from "bun:test"
import { no_multiple_blanks } from "../../src/rules/no_multiple_blanks"

const check = (content: string) =>
  no_multiple_blanks.check({ file: "test.md", lines: content.split("\n"), content })

describe("no-multiple-blanks", () => {
  test("single blank lines are fine", () => {
    expect(check("a\n\nb\n\nc\n")).toEqual([])
  })

  test("detects double blank lines", () => {
    const result = check("a\n\n\nb\n")
    expect(result).toHaveLength(1)
    expect(result[0].line).toBe(3)
    expect(result[0].rule).toBe("no-multiple-blanks")
  })

  test("detects triple blank lines (reports each consecutive)", () => {
    const result = check("a\n\n\n\nb\n")
    expect(result).toHaveLength(2)
  })

  test("no blank lines is fine", () => {
    expect(check("a\nb\nc\n")).toEqual([])
  })

  test("empty file produces no diagnostics", () => {
    expect(check("")).toEqual([])
  })
})
