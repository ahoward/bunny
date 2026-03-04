import { describe, it, expect } from "bun:test";
import { count_text } from "../src/count_text";

describe("count_text", () => {
  it("returns zeros for empty string", () => {
    const result = count_text("");
    expect(result).toEqual({ lines: 0, words: 0, characters: 0 });
  });

  it("counts a single word with newline", () => {
    const result = count_text("hello\n");
    expect(result).toEqual({ lines: 1, words: 1, characters: 6 });
  });

  it("counts multiple lines", () => {
    const result = count_text("the quick brown fox\njumps over the lazy dog\n");
    expect(result).toEqual({ lines: 2, words: 9, characters: 44 });
  });

  it("handles no trailing newline", () => {
    const result = count_text("hello world");
    expect(result).toEqual({ lines: 0, words: 2, characters: 11 });
  });

  it("handles only whitespace", () => {
    const result = count_text("\n");
    expect(result).toEqual({ lines: 1, words: 0, characters: 1 });
  });

  it("handles multiple spaces between words", () => {
    const result = count_text("hello   world\n");
    expect(result).toEqual({ lines: 1, words: 2, characters: 14 });
  });

  it("handles tabs as word separators", () => {
    const result = count_text("hello\tworld\n");
    expect(result).toEqual({ lines: 1, words: 2, characters: 12 });
  });

  it("counts characters as bytes (matching wc -c)", () => {
    // "é" in UTF-8 is 2 bytes
    const result = count_text("café\n");
    expect(result.characters).toBe(Buffer.byteLength("café\n"));
  });
});
