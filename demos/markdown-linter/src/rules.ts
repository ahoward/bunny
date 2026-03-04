import type { Block, LintMessage, Rule } from "./types";

function lines_in_code_blocks(blocks: Block[]): Set<number> {
  const code_lines = new Set<number>();
  for (const block of blocks) {
    if (block.type === "fenced_code" || block.type === "indented_code") {
      for (let l = block.line_start; l <= block.line_end; l++) {
        code_lines.add(l);
      }
    }
  }
  return code_lines;
}

const no_heading_skip: Rule = {
  id: "no-heading-skip",
  description: "Heading levels should not be skipped",
  severity: "warning",
  check(blocks, _lines, file) {
    const messages: LintMessage[] = [];
    const headings = blocks.filter((b) => b.type === "heading");
    for (let i = 1; i < headings.length; i++) {
      const prev_level = headings[i - 1].meta.level as number;
      const curr_level = headings[i].meta.level as number;
      if (curr_level > prev_level + 1) {
        messages.push({
          file,
          line: headings[i].line_start,
          column: 1,
          severity: "warning",
          message: `Heading level skipped (H${prev_level} → H${curr_level})`,
          rule_id: "no-heading-skip",
          suggestion: `Use H${prev_level + 1} before H${curr_level}`,
        });
      }
    }
    return messages;
  },
};

const single_h1: Rule = {
  id: "single-h1",
  description: "Only one H1 heading per document",
  severity: "warning",
  check(blocks, _lines, file) {
    const messages: LintMessage[] = [];
    const h1s = blocks.filter((b) => b.type === "heading" && b.meta.level === 1);
    for (let i = 1; i < h1s.length; i++) {
      messages.push({
        file,
        line: h1s[i].line_start,
        column: 1,
        severity: "warning",
        message: "Multiple H1 headings found",
        rule_id: "single-h1",
        suggestion: "Use only one H1 per document",
      });
    }
    return messages;
  },
};

const no_trailing_whitespace: Rule = {
  id: "no-trailing-whitespace",
  description: "No trailing whitespace",
  severity: "warning",
  check(blocks, lines, file) {
    const messages: LintMessage[] = [];
    const code_lines = lines_in_code_blocks(blocks);
    for (let i = 0; i < lines.length; i++) {
      const line_num = i + 1;
      if (code_lines.has(line_num)) continue;
      if (/\s+$/.test(lines[i]) && lines[i].trim() !== "") {
        messages.push({
          file,
          line: line_num,
          column: lines[i].trimEnd().length + 1,
          severity: "warning",
          message: "Trailing whitespace",
          rule_id: "no-trailing-whitespace",
          suggestion: null,
        });
      }
    }
    return messages;
  },
};

const no_hard_tabs: Rule = {
  id: "no-hard-tabs",
  description: "No hard tabs",
  severity: "warning",
  check(blocks, lines, file) {
    const messages: LintMessage[] = [];
    const code_lines = lines_in_code_blocks(blocks);
    for (let i = 0; i < lines.length; i++) {
      const line_num = i + 1;
      if (code_lines.has(line_num)) continue;
      const tab_idx = lines[i].indexOf("\t");
      if (tab_idx >= 0) {
        messages.push({
          file,
          line: line_num,
          column: tab_idx + 1,
          severity: "warning",
          message: "Hard tab found",
          rule_id: "no-hard-tabs",
          suggestion: null,
        });
      }
    }
    return messages;
  },
};

const no_consecutive_blank_lines: Rule = {
  id: "no-consecutive-blank-lines",
  description: "No more than one consecutive blank line",
  severity: "warning",
  check(_blocks, lines, file) {
    const messages: LintMessage[] = [];
    let blank_count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "") {
        blank_count++;
        if (blank_count > 1) {
          messages.push({
            file,
            line: i + 1,
            column: 1,
            severity: "warning",
            message: "Multiple consecutive blank lines",
            rule_id: "no-consecutive-blank-lines",
            suggestion: null,
          });
          // Only report once per run of blank lines
          while (i + 1 < lines.length && lines[i + 1].trim() === "") {
            i++;
          }
        }
      } else {
        blank_count = 0;
      }
    }
    return messages;
  },
};

const fenced_code_language: Rule = {
  id: "fenced-code-language",
  description: "Fenced code blocks should specify a language",
  severity: "info",
  check(blocks, _lines, file) {
    const messages: LintMessage[] = [];
    for (const block of blocks) {
      if (block.type === "fenced_code" && !block.meta.language) {
        messages.push({
          file,
          line: block.line_start,
          column: 1,
          severity: "info",
          message: "Fenced code block without language specification",
          rule_id: "fenced-code-language",
          suggestion: "Add a language identifier after the opening fence",
        });
      }
    }
    return messages;
  },
};

const no_unclosed_fence: Rule = {
  id: "no-unclosed-fence",
  description: "Fenced code blocks must be closed",
  severity: "error",
  check(blocks, _lines, file) {
    const messages: LintMessage[] = [];
    for (const block of blocks) {
      if (block.type === "fenced_code" && block.meta.closed === 0) {
        messages.push({
          file,
          line: block.line_start,
          column: 1,
          severity: "error",
          message: "Unclosed fenced code block",
          rule_id: "no-unclosed-fence",
          suggestion: "Add a closing fence (``` or ~~~)",
        });
      }
    }
    return messages;
  },
};

const final_newline: Rule = {
  id: "final-newline",
  description: "Files should end with a newline",
  severity: "warning",
  check(_blocks, _lines, file) {
    // This rule operates on raw content, handled in linter.ts
    return [];
  },
};

export function get_all_rules(): Rule[] {
  return [
    no_heading_skip,
    single_h1,
    no_trailing_whitespace,
    no_hard_tabs,
    no_consecutive_blank_lines,
    fenced_code_language,
    no_unclosed_fence,
    final_newline,
  ];
}
