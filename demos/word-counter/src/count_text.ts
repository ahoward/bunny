export type TextCounts = {
  lines: number;
  words: number;
  characters: number;
};

export function count_text(content: string): TextCounts {
  const characters = Buffer.byteLength(content);

  if (characters === 0) {
    return { lines: 0, words: 0, characters: 0 };
  }

  let lines = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") lines++;
  }

  const words = content.trim().length === 0
    ? 0
    : content.trim().split(/\s+/).length;

  return { lines, words, characters };
}
