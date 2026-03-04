import { describe, it, expect } from "bun:test";
import { tokenize } from "../src/tokenizer";

describe("tokenize", () => {
  it("returns empty array for empty input", () => {
    const blocks = tokenize("");
    expect(blocks).toEqual([]);
  });

  it("tokenizes a heading", () => {
    const blocks = tokenize("# Hello World");
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].meta.level).toBe(1);
    expect(blocks[0].line_start).toBe(1);
  });

  it("tokenizes multiple heading levels", () => {
    const blocks = tokenize("# H1\n\n## H2\n\n### H3");
    const headings = blocks.filter((b) => b.type === "heading");
    expect(headings.length).toBe(3);
    expect(headings[0].meta.level).toBe(1);
    expect(headings[1].meta.level).toBe(2);
    expect(headings[2].meta.level).toBe(3);
  });

  it("tokenizes a fenced code block", () => {
    const md = "```js\nconsole.log('hi');\n```";
    const blocks = tokenize(md);
    const code = blocks.find((b) => b.type === "fenced_code");
    expect(code).toBeDefined();
    expect(code!.meta.language).toBe("js");
    expect(code!.line_start).toBe(1);
    expect(code!.line_end).toBe(3);
  });

  it("tokenizes paragraphs", () => {
    const blocks = tokenize("Hello world.\n\nAnother paragraph.");
    const paras = blocks.filter((b) => b.type === "paragraph");
    expect(paras.length).toBe(2);
  });

  it("tokenizes blank lines", () => {
    const blocks = tokenize("Hello\n\nWorld");
    const blanks = blocks.filter((b) => b.type === "blank");
    expect(blanks.length).toBe(1);
  });

  it("tokenizes list items", () => {
    const blocks = tokenize("- item one\n- item two\n- item three");
    const items = blocks.filter((b) => b.type === "list_item");
    expect(items.length).toBe(3);
  });

  it("tokenizes blockquotes", () => {
    const blocks = tokenize("> quoted text");
    expect(blocks[0].type).toBe("blockquote");
  });

  it("tokenizes front matter", () => {
    const md = "---\ntitle: Hello\n---\n\n# Content";
    const blocks = tokenize(md);
    expect(blocks[0].type).toBe("front_matter");
  });

  it("tokenizes thematic breaks", () => {
    const blocks = tokenize("---\n\nContent after");
    // Without front matter context (not at start followed by closing ---), standalone --- is thematic break
    const breaks = blocks.filter((b) => b.type === "thematic_break");
    expect(breaks.length).toBe(1);
  });

  it("does not tokenize content inside fenced code as markdown", () => {
    const md = "```\n# Not a heading\n- Not a list\n```";
    const blocks = tokenize(md);
    const headings = blocks.filter((b) => b.type === "heading");
    const items = blocks.filter((b) => b.type === "list_item");
    expect(headings.length).toBe(0);
    expect(items.length).toBe(0);
  });

  it("handles unclosed fenced code block", () => {
    const md = "```\nsome code\nmore code";
    const blocks = tokenize(md);
    const code = blocks.find((b) => b.type === "fenced_code");
    expect(code).toBeDefined();
    expect(code!.line_end).toBe(3);
  });
});
