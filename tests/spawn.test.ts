import { describe, test, expect } from "bun:test"
import { spawn_sync, spawn_async, which_check, scrub_agent_env, create_sandbox, session_id_for } from "../src/lib/spawn.ts"

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

  test("stderr: 'inherit' returns empty stderr string", () => {
    const r = spawn_sync({ cmd: ["bash", "-c", "echo err >&2; echo out"], stderr: "inherit" })
    expect(r.ok).toBe(true)
    expect(r.stdout).toBe("out")
    expect(r.stderr).toBe("")
  })

  test("stderr defaults to pipe when not specified", () => {
    const r = spawn_sync({ cmd: ["bash", "-c", "echo captured >&2; exit 1"] })
    expect(r.ok).toBe(false)
    expect(r.stderr).toBe("captured")
    expect(r.detail).toBe("captured")
  })

  test("stderr: 'inherit' still produces detail from stdout on failure", () => {
    const r = spawn_sync({ cmd: ["bash", "-c", "echo fallback; exit 1"], stderr: "inherit" })
    expect(r.ok).toBe(false)
    expect(r.stderr).toBe("")
    expect(r.detail).toBe("fallback")
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

// -- sandbox --

describe("create_sandbox", () => {
  test("strips agent sentinels by default", () => {
    const old_claude = process.env.CLAUDECODE
    const old_gemini = process.env.GEMINI_CLI
    process.env.CLAUDECODE = "1"
    process.env.GEMINI_CLI = "1"
    try {
      const sb = create_sandbox("/tmp/test")
      expect(sb.env.CLAUDECODE).toBeUndefined()
      expect(sb.env.GEMINI_CLI).toBeUndefined()
    } finally {
      if (old_claude !== undefined) process.env.CLAUDECODE = old_claude
      else delete process.env.CLAUDECODE
      if (old_gemini !== undefined) process.env.GEMINI_CLI = old_gemini
      else delete process.env.GEMINI_CLI
    }
  })

  test("strips CLAUDE_CODE_ prefixed vars", () => {
    const old = process.env.CLAUDE_CODE_REMOTE
    process.env.CLAUDE_CODE_REMOTE = "1"
    try {
      const sb = create_sandbox("/tmp/test")
      expect(sb.env.CLAUDE_CODE_REMOTE).toBeUndefined()
    } finally {
      if (old !== undefined) process.env.CLAUDE_CODE_REMOTE = old
      else delete process.env.CLAUDE_CODE_REMOTE
    }
  })

  test("strips CI write tokens", () => {
    const old = process.env.GITHUB_TOKEN
    process.env.GITHUB_TOKEN = "ghp_secret"
    try {
      const sb = create_sandbox("/tmp/test")
      expect(sb.env.GITHUB_TOKEN).toBeUndefined()
    } finally {
      if (old !== undefined) process.env.GITHUB_TOKEN = old
      else delete process.env.GITHUB_TOKEN
    }
  })

  test("strips container internals", () => {
    const old = process.env.KUBERNETES_SERVICE_HOST
    process.env.KUBERNETES_SERVICE_HOST = "10.0.0.1"
    try {
      const sb = create_sandbox("/tmp/test")
      expect(sb.env.KUBERNETES_SERVICE_HOST).toBeUndefined()
    } finally {
      if (old !== undefined) process.env.KUBERNETES_SERVICE_HOST = old
      else delete process.env.KUBERNETES_SERVICE_HOST
    }
  })

  test("strips CURSOR_ and WINDSURF_ vars", () => {
    const old_c = process.env.CURSOR_SESSION
    const old_w = process.env.WINDSURF_IDE
    process.env.CURSOR_SESSION = "abc"
    process.env.WINDSURF_IDE = "1"
    try {
      const sb = create_sandbox("/tmp/test")
      expect(sb.env.CURSOR_SESSION).toBeUndefined()
      expect(sb.env.WINDSURF_IDE).toBeUndefined()
    } finally {
      if (old_c !== undefined) process.env.CURSOR_SESSION = old_c
      else delete process.env.CURSOR_SESSION
      if (old_w !== undefined) process.env.WINDSURF_IDE = old_w
      else delete process.env.WINDSURF_IDE
    }
  })

  test("preserves API keys and user vars", () => {
    const sb = create_sandbox("/tmp/test")
    // PATH and HOME are always in the real env
    expect(sb.env.PATH).toBeDefined()
    expect(sb.env.HOME).toBeDefined()
  })

  test("preserves arbitrary user env vars", () => {
    const old = process.env.MY_CUSTOM_APP_VAR
    process.env.MY_CUSTOM_APP_VAR = "hello"
    try {
      const sb = create_sandbox("/tmp/test")
      expect(sb.env.MY_CUSTOM_APP_VAR).toBe("hello")
    } finally {
      if (old !== undefined) process.env.MY_CUSTOM_APP_VAR = old
      else delete process.env.MY_CUSTOM_APP_VAR
    }
  })

  test("allowlist mode only keeps listed vars", () => {
    const old = process.env.MY_CUSTOM_APP_VAR
    process.env.MY_CUSTOM_APP_VAR = "hello"
    try {
      const sb = create_sandbox("/tmp/test", { allowlist: ["PATH", "HOME"] })
      expect(sb.env.PATH).toBeDefined()
      expect(sb.env.HOME).toBeDefined()
      expect(sb.env.MY_CUSTOM_APP_VAR).toBeUndefined()
    } finally {
      if (old !== undefined) process.env.MY_CUSTOM_APP_VAR = old
      else delete process.env.MY_CUSTOM_APP_VAR
    }
  })

  test("sets cwd and root from arguments", () => {
    const sb = create_sandbox("/my/project")
    expect(sb.cwd).toBe("/my/project")
    expect(sb.root).toBe("/my/project")
  })

  test("cwd can be overridden via opts", () => {
    const sb = create_sandbox("/my/project", { cwd: "/my/project/sub" })
    expect(sb.cwd).toBe("/my/project/sub")
    expect(sb.root).toBe("/my/project")
  })

  test("session_id defaults to null", () => {
    const sb = create_sandbox("/tmp/test")
    expect(sb.session_id).toBeNull()
  })

  test("session_id passed through from opts", () => {
    const sb = create_sandbox("/tmp/test", { session_id: "bny-auth-implement-r1" })
    expect(sb.session_id).toBe("bny-auth-implement-r1")
  })

  test("worktree is null (reserved for future)", () => {
    const sb = create_sandbox("/tmp/test")
    expect(sb.worktree).toBeNull()
  })

  test("env values are strings, not string|undefined", () => {
    const sb = create_sandbox("/tmp/test")
    for (const val of Object.values(sb.env)) {
      expect(typeof val).toBe("string")
    }
  })
})

describe("session_id_for", () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  test("feature + step returns valid UUID v4", () => {
    const id = session_id_for("001-auth", "implement")
    expect(id).toMatch(UUID_RE)
  })

  test("feature + step + round returns valid UUID v4", () => {
    const id = session_id_for("001-auth", "implement", 2)
    expect(id).toMatch(UUID_RE)
  })

  test("round 0 is included (different from no round)", () => {
    const with_round = session_id_for("feat", "step", 0)
    const without_round = session_id_for("feat", "step")
    expect(with_round).toMatch(UUID_RE)
    expect(without_round).toMatch(UUID_RE)
    expect(with_round).not.toBe(without_round)
  })

  test("deterministic — same inputs produce same UUID", () => {
    const a = session_id_for("001-auth", "implement")
    const b = session_id_for("001-auth", "implement")
    expect(a).toBe(b)
  })

  test("different inputs produce different UUIDs", () => {
    const a = session_id_for("001-auth", "implement")
    const b = session_id_for("001-auth", "verify")
    expect(a).not.toBe(b)
  })
})

describe("sandbox env in subprocess", () => {
  test("sandbox env strips CLAUDECODE from child processes", () => {
    const old = process.env.CLAUDECODE
    process.env.CLAUDECODE = "1"
    try {
      const sb = create_sandbox("/tmp/test")
      const r = spawn_sync({ cmd: ["bash", "-c", "echo ${CLAUDECODE:-unset}"], env: sb.env })
      expect(r.ok).toBe(true)
      expect(r.stdout).toBe("unset")
    } finally {
      if (old !== undefined) process.env.CLAUDECODE = old
      else delete process.env.CLAUDECODE
    }
  })

  test("sandbox env preserves GEMINI_API_KEY in child processes", () => {
    const old = process.env.GEMINI_API_KEY
    process.env.GEMINI_API_KEY = "test-key-123"
    try {
      const sb = create_sandbox("/tmp/test")
      const r = spawn_sync({ cmd: ["bash", "-c", "echo $GEMINI_API_KEY"], env: sb.env })
      expect(r.ok).toBe(true)
      expect(r.stdout).toBe("test-key-123")
    } finally {
      if (old !== undefined) process.env.GEMINI_API_KEY = old
      else delete process.env.GEMINI_API_KEY
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
