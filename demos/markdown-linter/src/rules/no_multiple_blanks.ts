import type { LineRule, Diagnostic } from "../types"

export const no_multiple_blanks: LineRule = {
  name: "no-multiple-blanks",
  kind: "line",
  check({ file, lines }) {
    const diagnostics: Diagnostic[] = []
    let prev_blank = false
    for (let i = 0; i < lines.length; i++) {
      const is_blank = lines[i].trim() === ""
      if (is_blank && prev_blank) {
        diagnostics.push({
          file,
          line: i + 1,
          column: 1,
          severity: "warning",
          rule: "no-multiple-blanks",
          message: "Multiple consecutive blank lines",
        })
      }
      prev_blank = is_blank
    }
    return diagnostics
  },
}
