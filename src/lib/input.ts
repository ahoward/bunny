//
// input.ts — unified input reading for bny commands
//
// three explicit modes:
//   positional args → inline text (handled by caller)
//   -               → stdin
//   --input <path>  → file read
//
// no existsSync guessing. no implicit file detection. unix-y.
//

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

export interface ReadInputResult {
  text:       string | null   // content from --input or stdin; null if neither
  source:     "stdin" | "file" | null
  file_path:  string | null   // absolute path when source is "file"
  rest_argv:  string[]        // argv with --input <path> and - consumed
}

export function read_input(argv: string[]): ReadInputResult {
  const rest_argv: string[] = []
  let text: string | null = null
  let source: "stdin" | "file" | null = null
  let file_path: string | null = null

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    // --input <path> → read file
    if (arg === "--input" && i + 1 < argv.length) {
      const path = resolve(argv[i + 1])
      if (!existsSync(path)) {
        process.stderr.write(`error: --input file not found: ${argv[i + 1]}\n`)
        return { text: null, source: "file", file_path: path, rest_argv: [] }
      }
      text = readFileSync(path, "utf-8").trim()
      file_path = path
      source = "file"
      i++ // consume the path arg
      continue
    }

    // bare "-" → read stdin
    if (arg === "-" && text === null) {
      text = readFileSync(0, "utf-8").trim()
      source = "stdin"
      continue
    }

    rest_argv.push(arg)
  }

  return { text, source, file_path, rest_argv }
}
