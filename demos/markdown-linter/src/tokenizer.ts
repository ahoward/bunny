import type { Block, BlockType } from "./types";

const HEADING_RE = /^(#{1,6})\s+/;
const FENCED_CODE_OPEN_RE = /^(`{3,}|~{3,})(\S*)/;
const LIST_ITEM_RE = /^(\s*)([-*+]|\d+[.)]) /;
const BLOCKQUOTE_RE = /^>\s?/;
const THEMATIC_BREAK_RE = /^([-*_])\s*(\1\s*){2,}$/;
const FRONT_MATTER_RE = /^---\s*$/;

export function tokenize(input: string): Block[] {
  if (input === "") return [];

  const lines = input.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  // Check for front matter at start of file
  if (lines.length >= 3 && FRONT_MATTER_RE.test(lines[0])) {
    let end = -1;
    for (let j = 1; j < lines.length; j++) {
      if (FRONT_MATTER_RE.test(lines[j])) {
        end = j;
        break;
      }
    }
    if (end > 0) {
      blocks.push({
        type: "front_matter",
        line_start: 1,
        line_end: end + 1,
        raw: lines.slice(0, end + 1).join("\n"),
        meta: {},
      });
      i = end + 1;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === "") {
      blocks.push({
        type: "blank",
        line_start: i + 1,
        line_end: i + 1,
        raw: line,
        meta: {},
      });
      i++;
      continue;
    }

    // Fenced code block
    const fence_match = line.match(FENCED_CODE_OPEN_RE);
    if (fence_match) {
      const fence_char = fence_match[1];
      const language = fence_match[2] || null;
      const start = i;
      let end = lines.length - 1; // default: unclosed
      let closed = false;

      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith(fence_char[0].repeat(fence_char.length)) && lines[j].trim() === fence_char[0].repeat(fence_char.length)) {
          end = j;
          closed = true;
          break;
        }
      }

      blocks.push({
        type: "fenced_code",
        line_start: start + 1,
        line_end: end + 1,
        raw: lines.slice(start, end + 1).join("\n"),
        meta: { language, closed: closed ? 1 : 0 },
      });
      i = end + 1;
      continue;
    }

    // Heading
    const heading_match = line.match(HEADING_RE);
    if (heading_match) {
      blocks.push({
        type: "heading",
        line_start: i + 1,
        line_end: i + 1,
        raw: line,
        meta: { level: heading_match[1].length },
      });
      i++;
      continue;
    }

    // Thematic break (must check before list items since --- could match)
    if (THEMATIC_BREAK_RE.test(line)) {
      blocks.push({
        type: "thematic_break",
        line_start: i + 1,
        line_end: i + 1,
        raw: line,
        meta: {},
      });
      i++;
      continue;
    }

    // List item
    if (LIST_ITEM_RE.test(line)) {
      blocks.push({
        type: "list_item",
        line_start: i + 1,
        line_end: i + 1,
        raw: line,
        meta: {},
      });
      i++;
      continue;
    }

    // Blockquote
    if (BLOCKQUOTE_RE.test(line)) {
      blocks.push({
        type: "blockquote",
        line_start: i + 1,
        line_end: i + 1,
        raw: line,
        meta: {},
      });
      i++;
      continue;
    }

    // Paragraph (default)
    blocks.push({
      type: "paragraph",
      line_start: i + 1,
      line_end: i + 1,
      raw: line,
      meta: {},
    });
    i++;
  }

  return blocks;
}
