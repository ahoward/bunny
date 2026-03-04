import { describe, test, expect } from "bun:test"
import { final_newline } from "../../src/rules/final_newline"

const check = (content: string) =>
  final_newline.check({ file: "test.md", lines: content.split("\n"), content })

describe("final-newline", () => {
  test("file ending with single newline is fine", () => {
    expect(check("hello\n")).toEqual([])
  })

  test("detects missing final newline", () => {
    const result = check("hello")
    expect(result).toHaveLength(1)
    expect(result[0].rule).toBe("final-newline")
    expect(result[0].message).toContain("must end with a newline")
  })

  test("detects extra trailing newlines", () => {
    const result = check("hello\n\n")
    expect(result).toHaveLength(1)
    expect(result[0].message).toContain("exactly one newline")
  })

  test("empty file produces no diagnostics", () => {
    expect(check("")).toEqual([])
  })

  test("file with only a newline is fine", () => {
    expect(check("\n")).toEqual([])
  })
})
