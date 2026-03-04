import type { LineRule, Diagnostic } from "../types"

export const trailing_whitespace: LineRule = {
  name: "trailing-whitespace",
  kind: "line",
  check({ file, lines }) {
    const diagnostics: Diagnostic[] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line !== line.trimEnd()) {
        diagnostics.push({
          file,
          line: i + 1,
          column: line.trimEnd().length + 1,
          severity: "warning",
          rule: "trailing-whitespace",
          message: "Trailing whitespace",
        })
      }
    }
    return diagnostics
  },
}
