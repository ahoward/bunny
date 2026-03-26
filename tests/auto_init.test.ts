import { describe, test, expect, afterEach } from "bun:test"
import { mkdtempSync, rmSync, existsSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { ensure_initialized } from "../src/init.ts"

describe("ensure_initialized (auto-init)", () => {
  const dirs: string[] = []

  function make_tmp(): string {
    const d = mkdtempSync(join(tmpdir(), "bny-auto-init-"))
    dirs.push(d)
    return d
  }

  afterEach(() => {
    for (const d of dirs) {
      rmSync(d, { recursive: true, force: true })
    }
    dirs.length = 0
  })

  test("creates bny/ with minimum state in a git repo", () => {
    const tmp = make_tmp()
    // init a git repo
    Bun.spawnSync(["git", "init"], { cwd: tmp })
    const result = ensure_initialized(tmp)
    expect(result).toBe(true)
    expect(existsSync(join(tmp, "bny"))).toBe(true)
    expect(existsSync(join(tmp, "bny/roadmap.md"))).toBe(true)
    expect(existsSync(join(tmp, "bny/decisions.md"))).toBe(true)
    expect(existsSync(join(tmp, "bny/constitution.md"))).toBe(true)
    expect(existsSync(join(tmp, "bny/guardrails.json"))).toBe(true)
  })

  test("is idempotent — returns false if bny/ already exists", () => {
    const tmp = make_tmp()
    Bun.spawnSync(["git", "init"], { cwd: tmp })
    expect(ensure_initialized(tmp)).toBe(true)
    expect(ensure_initialized(tmp)).toBe(false)
  })

  test("does nothing without a git repo", () => {
    const tmp = make_tmp()
    const result = ensure_initialized(tmp)
    expect(result).toBe(false)
    expect(existsSync(join(tmp, "bny"))).toBe(false)
  })

  test("does not overwrite existing bny/ contents", () => {
    const tmp = make_tmp()
    Bun.spawnSync(["git", "init"], { cwd: tmp })
    // pre-create bny/ with custom content
    mkdirSync(join(tmp, "bny"), { recursive: true })
    Bun.write(join(tmp, "bny/roadmap.md"), "# My Custom Roadmap\n")
    const result = ensure_initialized(tmp)
    expect(result).toBe(false) // bny/ already existed
    // custom content preserved
    const content = Bun.file(join(tmp, "bny/roadmap.md")).text()
    expect(content).resolves.toContain("My Custom Roadmap")
  })
})

describe("find_root auto-init", () => {
  test("hop --help works (exercises find_root path)", () => {
    const proc = Bun.spawnSync(
      ["bun", resolve(import.meta.dir, "../bin/bny.ts"), "hop", "--help"],
      { stdout: "pipe", stderr: "pipe", cwd: import.meta.dir + "/.." },
    )
    expect(proc.exitCode).toBe(0)
    const out = new TextDecoder().decode(proc.stdout)
    expect(out).toContain("auto-initializes")
  })
})
