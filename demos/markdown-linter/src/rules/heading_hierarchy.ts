import type { AstRule, Diagnostic } from "../types"
import type { Heading } from "mdast"

export const heading_hierarchy: AstRule = {
  name: "heading-hierarchy",
  kind: "ast",
  check({ file, ast }) {
    const diagnostics: Diagnostic[] = []
    const headings: Heading[] = []

    function walk(node: any) {
      if (node.type === "heading") {
        headings.push(node as Heading)
      }
      if (node.children) {
        for (const child of node.children) {
          walk(child)
        }
      }
    }
    walk(ast)

    let prev_depth = 0
    for (const heading of headings) {
      const depth = heading.depth
      if (prev_depth > 0 && depth > prev_depth + 1) {
        const pos = heading.position
        diagnostics.push({
          file,
          line: pos?.start.line ?? 0,
          column: pos?.start.column ?? 1,
          severity: "warning",
          rule: "heading-hierarchy",
          message: `Heading level skipped: h${prev_depth} to h${depth}`,
        })
      }
      prev_depth = depth
    }
    return diagnostics
  },
}
