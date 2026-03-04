import type { CountResult } from "./types";

export const count_words = (text: string): number => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
};

export const count_lines = (text: string): number => {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") count++;
  }
  return count;
};

export const count_chars = (text: string): number => {
  // spread into array to count code points, not UTF-16 code units
  return [...text].length;
};

export const count_all = (text: string, file: string | null): CountResult => ({
  file,
  lines: count_lines(text),
  words: count_words(text),
  chars: count_chars(text),
});
