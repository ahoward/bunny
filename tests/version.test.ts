import { describe, test, expect } from "bun:test"
import { app } from "../src/index.ts"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("Contract: /version handler", () => {
  test("P2: Handler returns success Result with all required keys", async () => {
    const result = await app.call("/version")
    expect(result.status).toBe("success")
    expect(result.result).toBeDefined()
    
    const data = result.result as any
    expect(typeof data.version).toBe("string")
    expect(data.version).toMatch(/^\d+\.\d+\.\d+/)
    expect(typeof data.bun_version).toBe("string")
    expect(typeof data.platform).toBe("string")
    expect(typeof data.arch).toBe("string")
    
    if (data.git_sha !== null) {
      expect(typeof data.git_sha).toBe("string")
      expect(data.git_sha).toMatch(/^[0-9a-f]{7,40}$/)
    }
  })

  test("FR-003: version matches package.json of the project root", async () => {
    const pkg = await Bun.file(join(process.cwd(), "package.json")).json()
    const result = await app.call("/version")
    expect((result.result as any).version).toBe(pkg.version)
  })
})

describe("Contract: bny version CLI", () => {
  test("P1 & FR-001/FR-009: Prints valid JSON to stdout with no stderr noise", () => {
    const bnyPath = join(process.cwd(), "bin/bny.ts")
    const proc = Bun.spawnSync(["bun", "run", bnyPath, "version"])
    expect(proc.exitCode).toBe(0)
    
    const stdout = proc.stdout.toString().trim()
    const stderr = proc.stderr.toString().trim()
    
    expect(stderr).toBe("") // FR-009: MUST NOT write to stderr
    
    const data = JSON.parse(stdout) // FR-001: MUST be single JSON object
    expect(data.version).toBeDefined()
    expect(data.bun_version).toBeDefined()
    expect(data.platform).toBeDefined()
    expect(data.arch).toBeDefined()
    expect(data.git_sha !== undefined).toBeTrue()
  })

  test("Challenge 1: Resolves correct context when run from outside the project directory", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "bny-cwd-test-"))
    try {
      const bnyPath = join(process.cwd(), "bin/bny.ts")
      const proc = Bun.spawnSync(["bun", "run", bnyPath, "version"], {
        cwd: tempDir, // Run from a different directory
        env: { ...process.env }
      })
      
      expect(proc.exitCode).toBe(0)
      const data = JSON.parse(proc.stdout.toString().trim())
      
      const pkg = await Bun.file(join(process.cwd(), "package.json")).json()
      expect(data.version).toBe(pkg.version)
      
      const gitProc = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], {
        cwd: process.cwd()
      })
      if (gitProc.exitCode === 0) {
        expect(data.git_sha).toBe(gitProc.stdout.toString().trim())
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  test("Challenge 3: Does not corrupt JSON when BUNNY_LOG=debug is set", () => {
    const bnyPath = join(process.cwd(), "bin/bny.ts")
    const proc = Bun.spawnSync(["bun", "run", bnyPath, "version"], {
      env: { ...process.env, BUNNY_LOG: "debug" }
    })
    
    expect(proc.exitCode).toBe(0)
    const stdout = proc.stdout.toString().trim()
    
    // Should still be pure JSON on stdout, logs should go to stderr or be suppressed
    expect(() => JSON.parse(stdout)).not.toThrow()
  })
})
