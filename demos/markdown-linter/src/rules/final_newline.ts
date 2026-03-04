import type { LineRule, Diagnostic } from "../types"

export const final_newline: LineRule = {
  name: "final-newline",
  kind: "line",
  check({ file, content }) {
    const diagnostics: Diagnostic[] = []
    if (content.length === 0) {
      return diagnostics
    }
    if (!content.endsWith("\n")) {
      const lines = content.split("\n")
      diagnostics.push({
        file,
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
        severity: "warning",
        rule: "final-newline",
        message: "File must end with a newline",
      })
    } else if (content.endsWith("\n\n")) {
      const lines = content.split("\n")
      diagnostics.push({
        file,
        line: lines.length - 1,
        column: 1,
        severity: "warning",
        rule: "final-newline",
        message: "File must end with exactly one newline",
      })
    }
    return diagnostics
  },
}
