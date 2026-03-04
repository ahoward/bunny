import type { FizzbuzzResult } from "./types";

export function fizzbuzz(n: number): string {
  if (n % 15 === 0) return "fizzbuzz";
  if (n % 3 === 0) return "fizz";
  if (n % 5 === 0) return "buzz";
  return String(n);
}

export function fizzbuzz_range(from: number, to: number): FizzbuzzResult[] {
  const results: FizzbuzzResult[] = [];
  for (let i = from; i <= to; i++) {
    results.push({ number: i, result: fizzbuzz(i) });
  }
  return results;
}
