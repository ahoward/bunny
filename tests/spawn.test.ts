import { describe, test, expect } from "bun:test"
import { spawn_sync, spawn_async, which_check, scrub_agent_env } from "../src/lib/spawn.ts"

describe("spawn_sync", () => {
  test("captures stdout from successful command", () => {
    const r = spawn_sync({ cmd: ["echo", "hello"] })
    expect(r.ok).toBe(true)
    expect(r.exit_code).toBe(0)
    expect(r.stdout).toBe("hello")
    expect(r.detail).toBe("")
    expect(r.timed_out).toBe(false)
  })

  test("captures stderr from failed command", () => {
    const r = spawn_sync({ cmd: ["bash", "-c", "echo oops >&2; exit 1"] })
    expect(r.ok).toBe(false)
    expect(r.exit_code).toBe(1)
    expect(r.stderr).toBe("oops")
    expect(r.detail).toBe("oops")
  })

  test("falls back to stdout when stderr is empty on failure", () => {
    const r = spawn_sync({ cmd: ["bash", "-c", "echo fallback; exit 1"] })
    expect(r.ok).toBe(false)
    expect(r.detail).toBe("fallback")
  })

  test("falls back to exit code when both streams empty", () => {
    const r = spawn_sync({ cmd: ["bash", "-c", "exit 42"] })
    expect(r.ok).toBe(false)
    expect(r.exit_code).toBe(42)
    expect(r.detail).toBe("exit code 42")
  })

  test("accepts stdin as string", () => {
    const r = spawn_sync({ cmd: ["cat"], stdin: "piped input" })
    expect(r.ok).toBe(true)
    expect(r.stdout).toBe("piped input")
  })

  test("accepts stdin as Buffer", () => {
    const r = spawn_sync({ cmd: ["cat"], stdin: Buffer.from("buffer input") })
    expect(r.ok).toBe(true)
    expect(r.stdout).toBe("buffer input")
  })
})

describe("spawn_async", () => {
  test("captures piped stdout from successful command", async () => {
    const r = await spawn_async({ cmd: ["echo", "async hello"], stdout: "pipe", stderr: "pipe" })
    expect(r.ok).toBe(true)
    expect(r.exit_code).toBe(0)
    expect(r.stdout).toBe("async hello")
    expect(r.timed_out).toBe(false)
  })

  test("captures piped stderr from failed command", async () => {
    const r = await spawn_async({ cmd: ["bash", "-c", "echo bad >&2; exit 1"], stdout: "pipe", stderr: "pipe" })
    expect(r.ok).toBe(false)
    expect(r.stderr).toBe("bad")
    expect(r.detail).toBe("bad")
  })

  test("returns null for inherited streams", async () => {
    const r = await spawn_async({ cmd: ["true"] })
    expect(r.ok).toBe(true)
    expect(r.stdout).toBeNull()
    expect(r.stderr).toBeNull()
  })
})

describe("scrub_agent_env", () => {
  test("strips CLAUDECODE sentinel", () => {
    const env = scrub_agent_env({ CLAUDECODE: "1", HOME: "/home/user" })
    expect(env.CLAUDECODE).toBeUndefined()
    expect(env.HOME).toBe("/home/user")
  })

  test("strips CLAUDE_CODE_ prefixed vars", () => {
    const env = scrub_agent_env({
      CLAUDE_CODE_ENTRYPOINT: "sdk-py",
      CLAUDE_CODE_IS_COWORK: "true",
      CLAUDE_CODE_REMOTE: "1",
      CLAUDE_CODE_SUBAGENT_MODEL: "sonnet",
      ANTHROPIC_API_KEY: "sk-ant-xxx",
    })
    expect(env.CLAUDE_CODE_ENTRYPOINT).toBeUndefined()
    expect(env.CLAUDE_CODE_IS_COWORK).toBeUndefined()
    expect(env.CLAUDE_CODE_REMOTE).toBeUndefined()
    expect(env.CLAUDE_CODE_SUBAGENT_MODEL).toBeUndefined()
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-xxx")
  })

  test("strips GEMINI_CLI sentinel and IDE vars", () => {
    const env = scrub_agent_env({
      GEMINI_CLI: "1",
      GEMINI_CLI_IDE_WORKSPACE_PATH: "/foo",
      GEMINI_API_KEY: "gm-xxx",
    })
    expect(env.GEMINI_CLI).toBeUndefined()
    expect(env.GEMINI_CLI_IDE_WORKSPACE_PATH).toBeUndefined()
    expect(env.GEMINI_API_KEY).toBe("gm-xxx")
  })

  test("strips COPILOT_CLI sentinel", () => {
    const env = scrub_agent_env({ COPILOT_CLI: "1", PATH: "/usr/bin" })
    expect(env.COPILOT_CLI).toBeUndefined()
    expect(env.PATH).toBe("/usr/bin")
  })

  test("strips CLAUDE_AGENT_ SDK vars", () => {
    const env = scrub_agent_env({ CLAUDE_AGENT_SDK_VERSION: "0.1.0", BNY_MODEL: "opus" })
    expect(env.CLAUDE_AGENT_SDK_VERSION).toBeUndefined()
    expect(env.BNY_MODEL).toBe("opus")
  })

  test("preserves all non-agent vars", () => {
    const env = scrub_agent_env({
      HOME: "/home/user",
      PATH: "/usr/bin",
      ANTHROPIC_API_KEY: "sk-xxx",
      GEMINI_API_KEY: "gm-xxx",
      BNY_MODEL: "opus",
      BUNNY_LOG: "1",
    })
    expect(env.HOME).toBe("/home/user")
    expect(env.PATH).toBe("/usr/bin")
    expect(env.ANTHROPIC_API_KEY).toBe("sk-xxx")
    expect(env.GEMINI_API_KEY).toBe("gm-xxx")
    expect(env.BNY_MODEL).toBe("opus")
    expect(env.BUNNY_LOG).toBe("1")
  })

  test("defaults to process.env when no base given", () => {
    const env = scrub_agent_env()
    // should have PATH from the real environment
    expect(env.PATH).toBeDefined()
  })

  test("does not mutate the input object", () => {
    const original = { CLAUDECODE: "1", HOME: "/home/user" }
    scrub_agent_env(original)
    expect(original.CLAUDECODE).toBe("1")
  })
})

describe("spawn_sync scrubs agent env", () => {
  test("CLAUDECODE is not visible to child processes", () => {
    // set it in process.env temporarily
    const old = process.env.CLAUDECODE
    process.env.CLAUDECODE = "1"
    try {
      const r = spawn_sync({ cmd: ["bash", "-c", "echo ${CLAUDECODE:-unset}"] })
      expect(r.ok).toBe(true)
      expect(r.stdout).toBe("unset")
    } finally {
      if (old !== undefined) process.env.CLAUDECODE = old
      else delete process.env.CLAUDECODE
    }
  })

  test("GEMINI_CLI is not visible to child processes", () => {
    const old = process.env.GEMINI_CLI
    process.env.GEMINI_CLI = "1"
    try {
      const r = spawn_sync({ cmd: ["bash", "-c", "echo ${GEMINI_CLI:-unset}"] })
      expect(r.ok).toBe(true)
      expect(r.stdout).toBe("unset")
    } finally {
      if (old !== undefined) process.env.GEMINI_CLI = old
      else delete process.env.GEMINI_CLI
    }
  })
})

describe("which_check", () => {
  test("returns true for a command that exists", () => {
    expect(which_check("echo")).toBe(true)
  })

  test("returns false for a command that does not exist", () => {
    expect(which_check("definitely_not_a_real_command_xyz")).toBe(false)
  })
})
