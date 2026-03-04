// POD types for the markdown linter

export type Severity = "error" | "warning" | "info";

export type LintMessage = {
  file: string;
  line: number;
  column: number;
  severity: Severity;
  message: string;
  rule_id: string;
  suggestion: string | null;
};

export type LintResult = {
  file: string;
  messages: LintMessage[];
  error_count: number;
  warning_count: number;
  info_count: number;
};

export type BlockType =
  | "heading"
  | "paragraph"
  | "fenced_code"
  | "indented_code"
  | "blank"
  | "list_item"
  | "blockquote"
  | "html_block"
  | "front_matter"
  | "thematic_break";

export type Block = {
  type: BlockType;
  line_start: number;
  line_end: number;
  raw: string;
  meta: Record<string, string | number | null>;
};

export type Rule = {
  id: string;
  description: string;
  severity: Severity;
  check: (blocks: Block[], lines: string[], file: string) => LintMessage[];
};

export type LintConfig = {
  rules: Record<string, { enabled: boolean; severity: Severity }>;
};

export type OutputFormat = "human" | "json" | "compact";

export type CliOptions = {
  files: string[];
  format: OutputFormat;
  config_path: string | null;
};
