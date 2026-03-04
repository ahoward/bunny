import { describe, expect, test } from "bun:test";
import { fizzbuzz, fizzbuzz_range } from "../src/fizzbuzz";

describe("fizzbuzz", () => {
  test("returns 'fizz' for multiples of 3", () => {
    expect(fizzbuzz(3)).toBe("fizz");
    expect(fizzbuzz(6)).toBe("fizz");
    expect(fizzbuzz(9)).toBe("fizz");
  });

  test("returns 'buzz' for multiples of 5", () => {
    expect(fizzbuzz(5)).toBe("buzz");
    expect(fizzbuzz(10)).toBe("buzz");
    expect(fizzbuzz(20)).toBe("buzz");
  });

  test("returns 'fizzbuzz' for multiples of 15", () => {
    expect(fizzbuzz(15)).toBe("fizzbuzz");
    expect(fizzbuzz(30)).toBe("fizzbuzz");
    expect(fizzbuzz(45)).toBe("fizzbuzz");
  });

  test("returns the number as string for non-multiples", () => {
    expect(fizzbuzz(1)).toBe("1");
    expect(fizzbuzz(2)).toBe("2");
    expect(fizzbuzz(4)).toBe("4");
    expect(fizzbuzz(7)).toBe("7");
  });

  test("handles large numbers", () => {
    expect(fizzbuzz(999999999999990)).toBe("fizzbuzz");
    expect(fizzbuzz(999999999999991)).toBe("999999999999991");
  });
});

describe("fizzbuzz_range", () => {
  test("returns correct results for 1 to 5", () => {
    const results = fizzbuzz_range(1, 5);
    expect(results).toEqual([
      { input: 1, result: "1" },
      { input: 2, result: "2" },
      { input: 3, result: "fizz" },
      { input: 4, result: "4" },
      { input: 5, result: "buzz" },
    ]);
  });

  test("handles single-element range", () => {
    expect(fizzbuzz_range(15, 15)).toEqual([{ input: 15, result: "fizzbuzz" }]);
  });

  test("returns correct results for 13 to 16", () => {
    const results = fizzbuzz_range(13, 16);
    expect(results).toEqual([
      { input: 13, result: "13" },
      { input: 14, result: "14" },
      { input: 15, result: "fizzbuzz" },
      { input: 16, result: "16" },
    ]);
  });
});
