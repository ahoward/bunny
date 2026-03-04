import { describe, test, expect } from "bun:test"
import { trailing_whitespace } from "../../src/rules/trailing_whitespace"

const check = (content: string) =>
  trailing_whitespace.check({ file: "test.md", lines: content.split("\n"), content })

describe("trailing-whitespace", () => {
  test("clean file produces no diagnostics", () => {
    expect(check("# Hello\n\nWorld\n")).toEqual([])
  })

  test("detects trailing spaces", () => {
    const result = check("hello   \nworld\n")
    expect(result).toHaveLength(1)
    expect(result[0].line).toBe(1)
    expect(result[0].column).toBe(6)
    expect(result[0].rule).toBe("trailing-whitespace")
  })

  test("detects trailing tab", () => {
    const result = check("hello\t\n")
    expect(result).toHaveLength(1)
    expect(result[0].line).toBe(1)
  })

  test("detects multiple lines with trailing whitespace", () => {
    const result = check("a \nb\nc \n")
    expect(result).toHaveLength(2)
    expect(result[0].line).toBe(1)
    expect(result[1].line).toBe(3)
  })

  test("empty file produces no diagnostics", () => {
    expect(check("")).toEqual([])
  })

  test("blank lines without trailing spaces are ok", () => {
    expect(check("a\n\nb\n")).toEqual([])
  })
})
