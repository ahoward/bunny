import { describe, expect, test } from "bun:test";
import { count_words, count_lines, count_chars, count_all } from "../src/lib/counter";

describe("count_words", () => {
  test("counts words separated by spaces", () => {
    expect(count_words("hello world")).toBe(2);
  });

  test("counts words separated by multiple spaces", () => {
    expect(count_words("hello   world")).toBe(2);
  });

  test("counts words separated by tabs", () => {
    expect(count_words("hello\tworld")).toBe(2);
  });

  test("counts words separated by newlines", () => {
    expect(count_words("hello\nworld")).toBe(2);
  });

  test("returns 0 for empty string", () => {
    expect(count_words("")).toBe(0);
  });

  test("returns 0 for whitespace only", () => {
    expect(count_words("   \t\n  ")).toBe(0);
  });

  test("counts single word", () => {
    expect(count_words("hello")).toBe(1);
  });

  test("handles leading and trailing whitespace", () => {
    expect(count_words("  hello world  ")).toBe(2);
  });

  test("handles mixed whitespace", () => {
    expect(count_words("one\ttwo\nthree  four")).toBe(4);
  });
});

describe("count_lines", () => {
  test("counts newline characters", () => {
    expect(count_lines("hello\nworld\n")).toBe(2);
  });

  test("returns 0 for empty string", () => {
    expect(count_lines("")).toBe(0);
  });

  test("returns 0 for string without newlines", () => {
    expect(count_lines("hello")).toBe(0);
  });

  test("counts single newline", () => {
    expect(count_lines("\n")).toBe(1);
  });

  test("counts multiple newlines", () => {
    expect(count_lines("\n\n\n")).toBe(3);
  });

  test("handles CRLF as one line", () => {
    expect(count_lines("hello\r\nworld\r\n")).toBe(2);
  });
});

describe("count_chars", () => {
  test("counts ASCII characters", () => {
    expect(count_chars("hello")).toBe(5);
  });

  test("returns 0 for empty string", () => {
    expect(count_chars("")).toBe(0);
  });

  test("counts spaces as characters", () => {
    expect(count_chars("hi there")).toBe(8);
  });

  test("counts newlines as characters", () => {
    expect(count_chars("hi\n")).toBe(3);
  });

  test("counts unicode code points not bytes", () => {
    // é is one code point (U+00E9)
    expect(count_chars("café")).toBe(4);
  });

  test("counts emoji as code points", () => {
    // 😀 is one code point
    expect(count_chars("😀")).toBe(1);
  });
});

describe("count_all", () => {
  test("returns all counts for a simple string", () => {
    const result = count_all("hello world\n", "test.txt");
    expect(result).toEqual({
      file: "test.txt",
      lines: 1,
      words: 2,
      chars: 12,
    });
  });

  test("returns all zeros for empty string", () => {
    const result = count_all("", "empty.txt");
    expect(result).toEqual({
      file: "empty.txt",
      lines: 0,
      words: 0,
      chars: 0,
    });
  });

  test("uses null file when no filename given", () => {
    const result = count_all("hi", null);
    expect(result.file).toBeNull();
  });
});
