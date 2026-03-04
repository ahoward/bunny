import { describe, test, expect } from "bun:test"
import { heading_hierarchy } from "../../src/rules/heading_hierarchy"
import { parse_markdown } from "../../src/parse"

const check = (content: string) =>
  heading_hierarchy.check({ file: "test.md", ast: parse_markdown(content), content })

describe("heading-hierarchy", () => {
  test("sequential headings are fine", () => {
    expect(check("# H1\n\n## H2\n\n### H3\n")).toEqual([])
  })

  test("detects skipped level h1 to h3", () => {
    const result = check("# H1\n\n### H3\n")
    expect(result).toHaveLength(1)
    expect(result[0].rule).toBe("heading-hierarchy")
    expect(result[0].message).toContain("h1 to h3")
  })

  test("detects skipped level h2 to h4", () => {
    const result = check("# H1\n\n## H2\n\n#### H4\n")
    expect(result).toHaveLength(1)
    expect(result[0].message).toContain("h2 to h4")
  })

  test("going back up in level is fine", () => {
    expect(check("# H1\n\n## H2\n\n### H3\n\n## H2 again\n")).toEqual([])
  })

  test("single heading is fine", () => {
    expect(check("## H2\n")).toEqual([])
  })

  test("empty file produces no diagnostics", () => {
    expect(check("")).toEqual([])
  })

  test("headings inside code blocks are ignored by parser", () => {
    const content = "# H1\n\n```\n### not a heading\n```\n\n## H2\n"
    expect(check(content)).toEqual([])
  })
})
