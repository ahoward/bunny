import type { Diagnostic, Rule } from "./types"
import { parse_markdown } from "./parse"

export function lint(file: string, content: string, rules: Rule[]): Diagnostic[] {
  const lines = content.split("\n")
  const ast = parse_markdown(content)
  const diagnostics: Diagnostic[] = []

  for (const rule of rules) {
    try {
      if (rule.kind === "line") {
        diagnostics.push(...rule.check({ file, lines, content }))
      } else {
        diagnostics.push(...rule.check({ file, ast, content }))
      }
    } catch (err) {
      diagnostics.push({
        file,
        line: 0,
        column: 0,
        severity: "error",
        rule: rule.name,
        message: `Rule crashed: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column)
  return diagnostics
}
