import { count_all, count_words, count_lines, count_chars } from "./lib/counter";
import type { CountResult } from "./lib/types";

interface CliOptions {
  files: string[];
  json: boolean;
  words_only: boolean;
  lines_only: boolean;
  chars_only: boolean;
}

const parse_args = (args: string[]): CliOptions => {
  const opts: CliOptions = {
    files: [],
    json: false,
    words_only: false,
    lines_only: false,
    chars_only: false,
  };

  for (const arg of args) {
    if (arg === "--json") opts.json = true;
    else if (arg === "--words") opts.words_only = true;
    else if (arg === "--lines") opts.lines_only = true;
    else if (arg === "--chars") opts.chars_only = true;
    else opts.files.push(arg);
  }

  return opts;
};

const format_columnar = (result: CountResult, opts: CliOptions): string => {
  const parts: string[] = [];
  const show_all = !opts.words_only && !opts.lines_only && !opts.chars_only;

  if (show_all || opts.lines_only) parts.push(String(result.lines).padStart(8));
  if (show_all || opts.words_only) parts.push(String(result.words).padStart(8));
  if (show_all || opts.chars_only) parts.push(String(result.chars).padStart(8));
  if (result.file) parts.push(` ${result.file}`);

  return parts.join("");
};

export const run = async (args: string[]): Promise<number> => {
  const opts = parse_args(args);

  if (opts.files.length === 0) {
    const text = await new Response(Bun.stdin.stream()).text();
    const result = count_all(text, null);

    if (opts.json) {
      console.log(JSON.stringify(result));
    } else {
      console.log(format_columnar(result, opts));
    }
    return 0;
  }

  for (const file_path of opts.files) {
    const bun_file = Bun.file(file_path);
    const exists = await bun_file.exists();

    if (!exists) {
      console.error(`wc: ${file_path}: No such file or directory`);
      return 1;
    }

    let text: string;
    try {
      text = await bun_file.text();
    } catch (err) {
      console.error(`wc: ${file_path}: Permission denied`);
      return 1;
    }

    const result = count_all(text, file_path);

    if (opts.json) {
      console.log(JSON.stringify(result));
    } else {
      console.log(format_columnar(result, opts));
    }
  }

  return 0;
};
