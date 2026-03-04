import type { LintMessage, LintResult } from "./types";
import { tokenize } from "./tokenizer";
import { get_all_rules } from "./rules";

export function lint_content(content: string, file: string): LintResult {
  const blocks = tokenize(content);
  const lines = content === "" ? [] : content.split("\n");
  const messages: LintMessage[] = [];

  for (const rule of get_all_rules()) {
    messages.push(...rule.check(blocks, lines, file));
  }

  // final-newline: check raw content (not handled by rule's check function)
  if (content.length > 0 && !content.endsWith("\n")) {
    messages.push({
      file,
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
      severity: "warning",
      message: "File does not end with a newline",
      rule_id: "final-newline",
      suggestion: null,
    });
  }

  // Sort by line, then column
  messages.sort((a, b) => a.line - b.line || a.column - b.column);

  let error_count = 0;
  let warning_count = 0;
  let info_count = 0;
  for (const msg of messages) {
    if (msg.severity === "error") error_count++;
    else if (msg.severity === "warning") warning_count++;
    else info_count++;
  }

  return { file, messages, error_count, warning_count, info_count };
}
