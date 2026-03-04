import { describe, expect, test } from "bun:test";
import { parse_positive_int, validate_range } from "../src/validate";

describe("parse_positive_int", () => {
  test("parses valid positive integers", () => {
    expect(parse_positive_int("1")).toEqual({ ok: true, value: 1 });
    expect(parse_positive_int("42")).toEqual({ ok: true, value: 42 });
    expect(parse_positive_int("1000")).toEqual({ ok: true, value: 1000 });
  });

  test("rejects zero", () => {
    const result = parse_positive_int("0");
    expect(result.ok).toBe(false);
  });

  test("rejects negative numbers", () => {
    const result = parse_positive_int("-5");
    expect(result.ok).toBe(false);
  });

  test("rejects non-integers", () => {
    expect(parse_positive_int("3.7").ok).toBe(false);
    expect(parse_positive_int("1.5").ok).toBe(false);
  });

  test("rejects non-numeric strings", () => {
    expect(parse_positive_int("abc").ok).toBe(false);
    expect(parse_positive_int("").ok).toBe(false);
    expect(parse_positive_int("12abc").ok).toBe(false);
  });

  test("rejects Infinity and NaN", () => {
    expect(parse_positive_int("Infinity").ok).toBe(false);
    expect(parse_positive_int("NaN").ok).toBe(false);
  });
});

describe("validate_range", () => {
  test("validates correct range", () => {
    expect(validate_range("1", "10")).toEqual({ ok: true, from: 1, to: 10 });
  });

  test("rejects missing from", () => {
    expect(validate_range(null, "10").ok).toBe(false);
  });

  test("rejects missing to", () => {
    expect(validate_range("1", null).ok).toBe(false);
  });

  test("rejects from > to", () => {
    const result = validate_range("10", "5");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("from must be <= to");
  });

  test("rejects range larger than 1000", () => {
    const result = validate_range("1", "1002");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Range too large");
  });

  test("accepts range of exactly 1000", () => {
    expect(validate_range("1", "1000").ok).toBe(true);
  });

  test("rejects invalid from value", () => {
    expect(validate_range("abc", "10").ok).toBe(false);
  });

  test("rejects invalid to value", () => {
    expect(validate_range("1", "abc").ok).toBe(false);
  });
});
