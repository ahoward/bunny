import { describe, it, expect } from "bun:test";
import { format_human, format_json, format_compact } from "../src/formatter";
import { parse_args } from "../src/cli";
import type { LintResult } from "../src/types";

const sample_result: LintResult = {
  file: "test.md",
  messages: [
    {
      file: "test.md",
      line: 3,
      column: 1,
      severity: "warning",
      message: "Heading level skipped (H1 → H3)",
      rule_id: "no-heading-skip",
      suggestion: "Use H2 before H3",
    },
    {
      file: "test.md",
      line: 5,
      column: 8,
      severity: "error",
      message: "Trailing whitespace",
      rule_id: "no-trailing-whitespace",
      suggestion: null,
    },
  ],
  error_count: 1,
  warning_count: 1,
  info_count: 0,
};

describe("format_human", () => {
  it("includes file path and line numbers", () => {
    const output = format_human([sample_result]);
    expect(output).toContain("test.md");
    expect(output).toContain("3:1");
    expect(output).toContain("5:8");
  });

  it("includes rule IDs", () => {
    const output = format_human([sample_result]);
    expect(output).toContain("no-heading-skip");
    expect(output).toContain("no-trailing-whitespace");
  });

  it("includes severity", () => {
    const output = format_human([sample_result]);
    expect(output).toContain("warning");
    expect(output).toContain("error");
  });

  it("shows summary", () => {
    const output = format_human([sample_result]);
    expect(output).toContain("1 error");
    expect(output).toContain("1 warning");
  });
});

describe("format_json", () => {
  it("returns valid JSON", () => {
    const output = format_json([sample_result]);
    const parsed = JSON.parse(output);
    expect(parsed).toBeArray();
    expect(parsed[0].file).toBe("test.md");
  });
});

describe("format_compact", () => {
  it("returns one line per issue", () => {
    const output = format_compact([sample_result]);
    const lines = output.trim().split("\n");
    expect(lines.length).toBe(2);
  });

  it("includes file:line:col format", () => {
    const output = format_compact([sample_result]);
    expect(output).toContain("test.md:3:1");
    expect(output).toContain("test.md:5:8");
  });
});

describe("parse_args", () => {
  it("parses file arguments", () => {
    const opts = parse_args(["file.md"]);
    expect(opts.files).toEqual(["file.md"]);
  });

  it("parses --format flag", () => {
    const opts = parse_args(["--format", "json", "file.md"]);
    expect(opts.format).toBe("json");
  });

  it("defaults to human format", () => {
    const opts = parse_args(["file.md"]);
    expect(opts.format).toBe("human");
  });

  it("parses --config flag", () => {
    const opts = parse_args(["--config", ".mlintrc.json", "file.md"]);
    expect(opts.config_path).toBe(".mlintrc.json");
  });

  it("handles multiple files", () => {
    const opts = parse_args(["a.md", "b.md", "c.md"]);
    expect(opts.files.length).toBe(3);
  });
});
