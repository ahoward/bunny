import type { CliOptions, OutputFormat } from "./types";
import type { LintResult } from "./types";
import { lint_content } from "./linter";
import { format_human, format_json, format_compact } from "./formatter";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export function parse_args(args: string[]): CliOptions {
  const files: string[] = [];
  let format: OutputFormat = "human";
  let config_path: string | null = null;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--format" && i + 1 < args.length) {
      format = args[i + 1] as OutputFormat;
      i += 2;
    } else if (arg === "--config" && i + 1 < args.length) {
      config_path = args[i + 1];
      i += 2;
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: mlint [options] <files...>");
      console.log("");
      console.log("Options:");
      console.log("  --format <human|json|compact>  Output format (default: human)");
      console.log("  --config <path>                Config file path");
      console.log("  --help, -h                     Show this help");
      process.exit(0);
    } else if (!arg.startsWith("--")) {
      files.push(arg);
      i++;
    } else {
      i++;
    }
  }

  return { files, format, config_path };
}

async function collect_files(paths: string[]): Promise<string[]> {
  const result: string[] = [];

  for (const p of paths) {
    const s = await stat(p);
    if (s.isDirectory()) {
      const entries = await readdir(p, { recursive: true });
      for (const entry of entries) {
        if (entry.endsWith(".md")) {
          result.push(join(p, entry));
        }
      }
    } else {
      result.push(p);
    }
  }

  return result;
}

export async function main(args: string[]): Promise<number> {
  const opts = parse_args(args);

  if (opts.files.length === 0) {
    console.error("Error: No files specified. Usage: mlint <files...>");
    return 3;
  }

  const files = await collect_files(opts.files);
  const results: LintResult[] = [];

  for (const file of files) {
    const content = await Bun.file(file).text();
    results.push(lint_content(content, file));
  }

  const formatter =
    opts.format === "json" ? format_json : opts.format === "compact" ? format_compact : format_human;

  const output = formatter(results);
  if (output) console.log(output);

  const has_errors = results.some((r) => r.error_count > 0);
  const has_warnings = results.some((r) => r.warning_count > 0);

  if (has_errors) return 2;
  if (has_warnings) return 1;
  return 0;
}

// Entry point when run directly
if (import.meta.main) {
  const exit_code = await main(process.argv.slice(2));
  process.exit(exit_code);
}
