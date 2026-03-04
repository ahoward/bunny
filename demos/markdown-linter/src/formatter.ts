import type { LintResult } from "./types";

export function format_human(results: LintResult[]): string {
  const lines: string[] = [];
  let total_errors = 0;
  let total_warnings = 0;
  let total_info = 0;

  for (const result of results) {
    total_errors += result.error_count;
    total_warnings += result.warning_count;
    total_info += result.info_count;

    for (const msg of result.messages) {
      lines.push(
        `${msg.file}:${msg.line}:${msg.column} ${msg.severity}  ${msg.message}  ${msg.rule_id}`
      );
      if (msg.suggestion) {
        lines.push(`  ${msg.suggestion}`);
      }
    }
  }

  if (lines.length > 0) {
    lines.push("");
  }

  const parts: string[] = [];
  if (total_errors > 0) parts.push(`${total_errors} error${total_errors !== 1 ? "s" : ""}`);
  if (total_warnings > 0) parts.push(`${total_warnings} warning${total_warnings !== 1 ? "s" : ""}`);
  if (total_info > 0) parts.push(`${total_info} info`);

  if (parts.length > 0) {
    lines.push(parts.join(", "));
  }

  return lines.join("\n");
}

export function format_json(results: LintResult[]): string {
  return JSON.stringify(results, null, 2);
}

export function format_compact(results: LintResult[]): string {
  const lines: string[] = [];
  for (const result of results) {
    for (const msg of result.messages) {
      lines.push(`${msg.file}:${msg.line}:${msg.column} ${msg.severity} ${msg.message} [${msg.rule_id}]`);
    }
  }
  return lines.join("\n");
}
