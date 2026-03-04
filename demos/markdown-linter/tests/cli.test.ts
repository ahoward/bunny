import { describe, test, expect } from "bun:test"
import { spawnSync } from "child_process"
import { writeFileSync, mkdirSync, rmSync } from "fs"
import { join } from "path"

const CLI = join(import.meta.dir, "../src/cli.ts")
const TMP = join(import.meta.dir, "fixtures/tmp")

function run_cli(...args: string[]) {
  const result = spawnSync("bun", ["run", CLI, ...args], {
    encoding: "utf-8",
    timeout: 10000,
  })
  return {
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    exit_code: result.status ?? 2,
  }
}

describe("cli", () => {
  test("no args prints usage and exits 2", () => {
    const { stderr, exit_code } = run_cli()
    expect(exit_code).toBe(2)
    expect(stderr).toContain("usage")
  })

  test("missing file prints error and exits 2", () => {
    const { stderr, exit_code } = run_cli("nonexistent.md")
    expect(exit_code).toBe(2)
    expect(stderr).toContain("No such file")
  })

  test("clean file exits 0 with no output", () => {
    mkdirSync(TMP, { recursive: true })
    const file = join(TMP, "clean.md")
    writeFileSync(file, "# Hello\n\nWorld\n")
    const { stdout, exit_code } = run_cli(file)
    expect(exit_code).toBe(0)
    expect(stdout).toBe("")
    rmSync(TMP, { recursive: true })
  })

  test("file with issues exits 1 with diagnostics", () => {
    mkdirSync(TMP, { recursive: true })
    const file = join(TMP, "bad.md")
    writeFileSync(file, "# Hello   \n\n\n\nWorld")
    const { stdout, exit_code } = run_cli(file)
    expect(exit_code).toBe(1)
    expect(stdout).toContain("trailing-whitespace")
    rmSync(TMP, { recursive: true })
  })

  test("diagnostic format is file:line:col: severity [rule] message", () => {
    mkdirSync(TMP, { recursive: true })
    const file = join(TMP, "format.md")
    writeFileSync(file, "hello   \n")
    const { stdout } = run_cli(file)
    expect(stdout).toMatch(/format\.md:\d+:\d+: warning \[trailing-whitespace\]/)
    rmSync(TMP, { recursive: true })
  })
})
