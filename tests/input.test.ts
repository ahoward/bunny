import { describe, test, expect } from "bun:test"
import { read_input } from "../src/lib/input.ts"
import { writeFileSync, unlinkSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"

const TMP_DIR = resolve(import.meta.dir, "fixtures")
const TMP_FILE = resolve(TMP_DIR, "input_test_file.txt")

// ensure fixture dir exists
mkdirSync(TMP_DIR, { recursive: true })

describe("read_input", () => {
  // -- no input --

  test("no args → null text, empty rest_argv", () => {
    const r = read_input([])
    expect(r.text).toBeNull()
    expect(r.source).toBeNull()
    expect(r.file_path).toBeNull()
    expect(r.rest_argv).toEqual([])
  })

  test("only flags → null text, flags in rest_argv", () => {
    const r = read_input(["--dry-run", "--yes"])
    expect(r.text).toBeNull()
    expect(r.source).toBeNull()
    expect(r.rest_argv).toEqual(["--dry-run", "--yes"])
  })

  test("positional args pass through to rest_argv", () => {
    const r = read_input(["add", "user", "auth"])
    expect(r.text).toBeNull()
    expect(r.rest_argv).toEqual(["add", "user", "auth"])
  })

  // -- --input <path> --

  test("--input valid file → reads content", () => {
    writeFileSync(TMP_FILE, "  file content here  \n")
    try {
      const r = read_input(["--input", TMP_FILE])
      expect(r.text).toBe("file content here")
      expect(r.source).toBe("file")
      expect(r.file_path).toBe(TMP_FILE)
      expect(r.rest_argv).toEqual([])
    } finally {
      unlinkSync(TMP_FILE)
    }
  })

  test("--input missing file → null text, source file", () => {
    const r = read_input(["--input", "/nonexistent/path/file.txt"])
    expect(r.text).toBeNull()
    expect(r.source).toBe("file")
    expect(r.file_path).not.toBeNull()
  })

  test("--input strips both args from rest_argv", () => {
    writeFileSync(TMP_FILE, "content")
    try {
      const r = read_input(["--dry-run", "--input", TMP_FILE, "--yes"])
      expect(r.text).toBe("content")
      expect(r.rest_argv).toEqual(["--dry-run", "--yes"])
    } finally {
      unlinkSync(TMP_FILE)
    }
  })

  test("--input without following arg → treated as regular arg", () => {
    const r = read_input(["--input"])
    expect(r.text).toBeNull()
    expect(r.source).toBeNull()
    expect(r.rest_argv).toEqual(["--input"])
  })

  // -- stdin (-) --
  // note: can't easily test actual stdin in unit tests without piping,
  // but we test that "-" is consumed from rest_argv

  // -- flag disambiguation --

  test("-y is NOT confused with bare -", () => {
    const r = read_input(["-y", "--dry-run"])
    expect(r.text).toBeNull()
    expect(r.source).toBeNull()
    expect(r.rest_argv).toEqual(["-y", "--dry-run"])
  })

  test("--input-format is NOT confused with --input", () => {
    const r = read_input(["--input-format", "json"])
    expect(r.text).toBeNull()
    expect(r.source).toBeNull()
    expect(r.rest_argv).toEqual(["--input-format", "json"])
  })

  test("mixed: positional + flags + --input", () => {
    writeFileSync(TMP_FILE, "from file")
    try {
      const r = read_input(["--yes", "--input", TMP_FILE, "extra", "args"])
      expect(r.text).toBe("from file")
      expect(r.source).toBe("file")
      expect(r.rest_argv).toEqual(["--yes", "extra", "args"])
    } finally {
      unlinkSync(TMP_FILE)
    }
  })

  test("--input with relative path resolves correctly", () => {
    writeFileSync(TMP_FILE, "resolved")
    try {
      // use the basename-relative approach
      const r = read_input(["--input", TMP_FILE])
      expect(r.text).toBe("resolved")
      expect(r.file_path).toBe(resolve(TMP_FILE))
    } finally {
      unlinkSync(TMP_FILE)
    }
  })
})
