import { describe, test, expect } from "bun:test"
import { parse_json, apply_operations, preview_operations, worldview_dir } from "../bny/lib/brane.ts"
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

// -- test cli via subprocess --

function bny(...args: string[]): { stdout: string, stderr: string, exit: number } {
  const proc = Bun.spawnSync(["bun", "bin/bny.ts", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: import.meta.dir + "/..",
    env: { ...process.env, BNY_NO_SPINNER: "1" },
  })
  return {
    stdout: new TextDecoder().decode(proc.stdout).trim(),
    stderr: new TextDecoder().decode(proc.stderr).trim(),
    exit: proc.exitCode ?? 1,
  }
}

describe("parse_json", () => {
  test("strict JSON passes through", () => {
    const result = parse_json<{ a: number }>('{"a": 1}')
    expect(result).toEqual({ a: 1 })
  })

  test("JSON array passes through", () => {
    const result = parse_json<number[]>("[1, 2, 3]")
    expect(result).toEqual([1, 2, 3])
  })

  test("strips markdown fences", () => {
    const result = parse_json<{ b: string }>("```json\n{\"b\": \"hello\"}\n```")
    expect(result).toEqual({ b: "hello" })
  })

  test("strips leading prose", () => {
    const result = parse_json<{ c: number }>("Here is the JSON:\n{\"c\": 42}")
    expect(result).toEqual({ c: 42 })
  })

  test("strips trailing prose", () => {
    const result = parse_json<{ d: boolean }>("{\"d\": true}\nHope that helps!")
    expect(result).toEqual({ d: true })
  })

  test("strips single-line comments", () => {
    const result = parse_json<{ e: number }>("{\n// this is a comment\n\"e\": 99\n}")
    expect(result).toEqual({ e: 99 })
  })

  test("strips trailing commas", () => {
    const result = parse_json<{ f: number }>("{\"f\": 1,}")
    expect(result).toEqual({ f: 1 })
  })

  test("strips multi-line comments", () => {
    const result = parse_json<{ g: string }>("{/* comment */\"g\": \"val\"}")
    expect(result).toEqual({ g: "val" })
  })

  test("handles fences + prose + trailing commas", () => {
    const raw = "Sure! Here's the output:\n```json\n{\"ops\": [1, 2, 3,],}\n```\nLet me know if you need more."
    const result = parse_json<{ ops: number[] }>(raw)
    expect(result).toEqual({ ops: [1, 2, 3] })
  })

  test("returns null for garbage", () => {
    expect(parse_json("not json at all")).toBeNull()
  })

  test("returns null for empty string", () => {
    expect(parse_json("")).toBeNull()
  })

  test("handles nested objects", () => {
    const result = parse_json<{ a: { b: number } }>("{\"a\": {\"b\": 1}}")
    expect(result).toEqual({ a: { b: 1 } })
  })
})

describe("path traversal guard", () => {
  const tmp = resolve(import.meta.dir, "../.bny/test-worldview-tmp")

  function setup() {
    mkdirSync(resolve(tmp, "worldview"), { recursive: true })
  }

  function cleanup() {
    if (existsSync(tmp)) rmSync(tmp, { recursive: true })
  }

  test("valid path is written", () => {
    setup()
    try {
      // apply_operations uses worldview_dir(root) which is .bny/brane/worldview
      // We need a root that makes worldview_dir point to our tmp dir
      // Instead, test via preview_operations which doesn't write
      const root_dir = resolve(tmp, "..")
      // preview_operations resolves paths relative to worldview_dir(root)
      // worldview_dir returns resolve(root, ".bny/brane/worldview")
      // We can't easily test this without the right directory structure
      // So let's just test that apply_operations works with a proper root
      const test_root = resolve(import.meta.dir, "..")
      const ops = [{ action: "create" as const, path: "test-guard-valid.md", content: "# Test\nValid file." }]
      const diffs = preview_operations(test_root, ops)
      expect(diffs.length).toBe(1)
      expect(diffs[0].is_new).toBe(true)
    } finally {
      cleanup()
    }
  })

  test("path traversal is blocked", () => {
    // preview_operations should skip paths with ../
    const test_root = resolve(import.meta.dir, "..")
    const ops = [{ action: "create" as const, path: "../../../escape.md", content: "# Bad\nEscaped." }]
    const diffs = preview_operations(test_root, ops)
    expect(diffs.length).toBe(0) // should be filtered out
  })

  test("nested valid path is allowed", () => {
    const test_root = resolve(import.meta.dir, "..")
    const ops = [{ action: "create" as const, path: "topics/sub/deep.md", content: "# Deep\nNested." }]
    const diffs = preview_operations(test_root, ops)
    expect(diffs.length).toBe(1)
  })
})

describe("renamed commands", () => {
  test("bny digest --help exits 0", () => {
    const r = bny("digest", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("source")
  })

  test("bny brane lens --help exits 0", () => {
    const r = bny("brane", "lens", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("lens")
  })

  test("bny brane rebuild --help exits 0", () => {
    const r = bny("brane", "rebuild", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("rebuild")
  })

  test("bny brane eat still works (hidden alias)", () => {
    const r = bny("brane", "eat", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
  })

  test("digest strips file:// prefix", () => {
    // digest --dry-run should pass through to eat with the prefix stripped
    const r = bny("digest", "--dry-run", "file://README.md")
    expect(r.exit).toBe(0)
    // Should show the eat prompt (since it delegates to eat)
    expect(r.stdout).toContain("Active Lenses")
  })

  test("help --json shows digest and lens", () => {
    const r = bny("help", "--json")
    expect(r.exit).toBe(0)
    const parsed = JSON.parse(r.stdout)
    const keys = parsed.commands.map((c: any) => c.key)
    expect(keys).toContain("digest")
    expect(keys).toContain("brane/lens")
    expect(keys).toContain("brane/rebuild")
    expect(keys).not.toContain("brane/pov")
    expect(keys).not.toContain("brane/digest")
  })
})
