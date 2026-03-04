import { describe, it, expect } from "bun:test";
import { tokenize } from "../src/tokenizer";
import { get_all_rules } from "../src/rules";
import { lint_content } from "../src/linter";

describe("rules", () => {
  describe("no-heading-skip", () => {
    it("flags skipped heading levels", () => {
      const result = lint_content("# Title\n\n### Skipped H2", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "no-heading-skip");
      expect(msgs.length).toBe(1);
      expect(msgs[0].line).toBe(3);
    });

    it("passes with sequential headings", () => {
      const result = lint_content("# Title\n\n## Section\n\n### Sub", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "no-heading-skip");
      expect(msgs.length).toBe(0);
    });
  });

  describe("single-h1", () => {
    it("flags multiple H1 headings", () => {
      const result = lint_content("# Title\n\n# Another Title", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "single-h1");
      expect(msgs.length).toBe(1);
      expect(msgs[0].line).toBe(3);
    });

    it("passes with single H1", () => {
      const result = lint_content("# Title\n\n## Section", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "single-h1");
      expect(msgs.length).toBe(0);
    });
  });

  describe("no-trailing-whitespace", () => {
    it("flags trailing whitespace", () => {
      const result = lint_content("Hello   \nWorld", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "no-trailing-whitespace");
      expect(msgs.length).toBe(1);
      expect(msgs[0].line).toBe(1);
    });

    it("ignores trailing whitespace inside code blocks", () => {
      const result = lint_content("```\ncode   \n```", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "no-trailing-whitespace");
      expect(msgs.length).toBe(0);
    });
  });

  describe("no-hard-tabs", () => {
    it("flags hard tabs", () => {
      const result = lint_content("Hello\tworld", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "no-hard-tabs");
      expect(msgs.length).toBe(1);
    });

    it("ignores tabs inside code blocks", () => {
      const result = lint_content("```\n\tindented code\n```", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "no-hard-tabs");
      expect(msgs.length).toBe(0);
    });
  });

  describe("no-consecutive-blank-lines", () => {
    it("flags more than one consecutive blank line", () => {
      const result = lint_content("Hello\n\n\nWorld", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "no-consecutive-blank-lines");
      expect(msgs.length).toBe(1);
    });

    it("allows single blank lines", () => {
      const result = lint_content("Hello\n\nWorld", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "no-consecutive-blank-lines");
      expect(msgs.length).toBe(0);
    });
  });

  describe("fenced-code-language", () => {
    it("flags fenced code blocks without language", () => {
      const result = lint_content("```\ncode\n```", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "fenced-code-language");
      expect(msgs.length).toBe(1);
    });

    it("passes when language is specified", () => {
      const result = lint_content("```js\ncode\n```", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "fenced-code-language");
      expect(msgs.length).toBe(0);
    });
  });

  describe("no-unclosed-fence", () => {
    it("flags unclosed fenced code blocks", () => {
      const result = lint_content("```\ncode\nmore code", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "no-unclosed-fence");
      expect(msgs.length).toBe(1);
    });

    it("passes with closed fenced code block", () => {
      const result = lint_content("```\ncode\n```", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "no-unclosed-fence");
      expect(msgs.length).toBe(0);
    });
  });

  describe("final-newline", () => {
    it("flags missing final newline", () => {
      const result = lint_content("Hello world", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "final-newline");
      expect(msgs.length).toBe(1);
    });

    it("passes when file ends with newline", () => {
      const result = lint_content("Hello world\n", "test.md");
      const msgs = result.messages.filter((m) => m.rule_id === "final-newline");
      expect(msgs.length).toBe(0);
    });
  });
});

describe("lint_content", () => {
  it("returns a LintResult with correct counts", () => {
    const result = lint_content("# Title\n\n### Skipped\n", "test.md");
    expect(result.file).toBe("test.md");
    expect(result.error_count + result.warning_count + result.info_count).toBe(
      result.messages.length
    );
  });

  it("handles empty files", () => {
    const result = lint_content("", "empty.md");
    expect(result.file).toBe("empty.md");
  });
});
