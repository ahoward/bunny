import type { Diagnostic } from "./types"

export function format_diagnostic(d: Diagnostic): string {
  return `${d.file}:${d.line}:${d.column}: ${d.severity} [${d.rule}] ${d.message}`
}

export function format_diagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics.map(format_diagnostic).join("\n")
}
