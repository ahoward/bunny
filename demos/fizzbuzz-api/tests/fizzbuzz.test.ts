import { describe, expect, test } from "bun:test";
import { fizzbuzz, fizzbuzz_range } from "../src/fizzbuzz";

describe("fizzbuzz", () => {
  test("returns 'fizz' for multiples of 3 (not 5)", () => {
    expect(fizzbuzz(3)).toBe("fizz");
    expect(fizzbuzz(6)).toBe("fizz");
    expect(fizzbuzz(9)).toBe("fizz");
    expect(fizzbuzz(12)).toBe("fizz");
  });

  test("returns 'buzz' for multiples of 5 (not 3)", () => {
    expect(fizzbuzz(5)).toBe("buzz");
    expect(fizzbuzz(10)).toBe("buzz");
    expect(fizzbuzz(20)).toBe("buzz");
    expect(fizzbuzz(25)).toBe("buzz");
  });

  test("returns 'fizzbuzz' for multiples of 15", () => {
    expect(fizzbuzz(15)).toBe("fizzbuzz");
    expect(fizzbuzz(30)).toBe("fizzbuzz");
    expect(fizzbuzz(45)).toBe("fizzbuzz");
    expect(fizzbuzz(60)).toBe("fizzbuzz");
  });

  test("returns the number as a string for non-matches", () => {
    expect(fizzbuzz(1)).toBe("1");
    expect(fizzbuzz(2)).toBe("2");
    expect(fizzbuzz(4)).toBe("4");
    expect(fizzbuzz(7)).toBe("7");
    expect(fizzbuzz(97)).toBe("97");
  });

  test("handles boundary values", () => {
    expect(fizzbuzz(1)).toBe("1");
    expect(fizzbuzz(100)).toBe("buzz");
  });

  test("handles large numbers", () => {
    expect(fizzbuzz(999999)).toBe("fizz");
    expect(fizzbuzz(1000000)).toBe("buzz");
    expect(fizzbuzz(999990)).toBe("fizzbuzz");
  });
});

describe("fizzbuzz_range", () => {
  test("returns correct results for 1..15", () => {
    const results = fizzbuzz_range(1, 15);
    expect(results).toHaveLength(15);
    expect(results[0]).toEqual({ number: 1, result: "1" });
    expect(results[2]).toEqual({ number: 3, result: "fizz" });
    expect(results[4]).toEqual({ number: 5, result: "buzz" });
    expect(results[14]).toEqual({ number: 15, result: "fizzbuzz" });
  });

  test("returns single element when from equals to", () => {
    const results = fizzbuzz_range(5, 5);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ number: 5, result: "buzz" });
  });
});
