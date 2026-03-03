import { describe, test, expect } from "bun:test"
import { slugify, dedup_slug } from "../bny/proposal.ts"

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

describe("bny proposal", () => {
  test("--help exits 0 and shows usage", () => {
    const r = bny("proposal", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("proposal")
  })

  test("accept --help exits 0 and shows usage", () => {
    const r = bny("proposal", "accept", "--help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("usage")
    expect(r.stdout).toContain("accept")
  })

  test("accept with no slug exits 1", () => {
    const r = bny("proposal", "accept")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("required")
  })

  test("accept nonexistent slug exits 1 with error", () => {
    const r = bny("proposal", "accept", "nonexistent-slug-xyz-999")
    expect(r.exit).toBe(1)
    expect(r.stderr).toContain("not found")
  })

  test("--dry-run prints prompt without calling claude", () => {
    const r = bny("proposal", "--dry-run", "test topic")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("Topic")
    expect(r.stdout).toContain("test topic")
    expect(r.stdout).toContain("Instructions")
    // should NOT contain code context sections (brane only)
    expect(r.stdout).not.toContain("Code Context")
  })

  test("proposal appears in bny help", () => {
    const r = bny("help")
    expect(r.exit).toBe(0)
    expect(r.stdout).toContain("proposal")
  })

  test("proposal appears in bny help --json", () => {
    const r = bny("help", "--json")
    expect(r.exit).toBe(0)
    const parsed = JSON.parse(r.stdout)
    const names = parsed.commands.map((c: any) => c.key)
    expect(names).toContain("proposal")
  })
})

describe("slugify", () => {
  test("title case to kebab", () => {
    expect(slugify("Auth System Overhaul")).toBe("auth-system-overhaul")
  })

  test("already lowercase", () => {
    expect(slugify("simple name")).toBe("simple-name")
  })

  test("special characters", () => {
    expect(slugify("What's Next? (v2)")).toBe("what-s-next-v2")
  })

  test("multiple spaces and hyphens collapse", () => {
    expect(slugify("too   many---dashes")).toBe("too-many-dashes")
  })

  test("leading/trailing non-alpha stripped", () => {
    expect(slugify("--hello world--")).toBe("hello-world")
  })

  test("truncates at 80 chars", () => {
    const long_title = "a".repeat(100)
    expect(slugify(long_title).length).toBeLessThanOrEqual(80)
  })

  test("empty string returns empty", () => {
    expect(slugify("")).toBe("")
  })

  test("numbers preserved", () => {
    expect(slugify("Phase 2 Auth")).toBe("phase-2-auth")
  })
})

describe("dedup_slug", () => {
  test("no conflict returns original", () => {
    expect(dedup_slug("auth", ["foo", "bar"])).toBe("auth")
  })

  test("conflict adds -2 suffix", () => {
    expect(dedup_slug("auth", ["auth", "foo"])).toBe("auth-2")
  })

  test("multiple conflicts increment", () => {
    expect(dedup_slug("auth", ["auth", "auth-2", "auth-3"])).toBe("auth-4")
  })

  test("empty existing list returns original", () => {
    expect(dedup_slug("auth", [])).toBe("auth")
  })
})
