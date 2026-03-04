import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { scan_secrets, check_secrets } from "../src/lib/secrets.ts"

describe("scan_secrets", () => {
  const saved_env: Record<string, string | undefined> = {}

  beforeEach(() => {
    saved_env.BNY_SECRETS_SCAN = process.env.BNY_SECRETS_SCAN
    delete process.env.BNY_SECRETS_SCAN
  })

  afterEach(() => {
    if (saved_env.BNY_SECRETS_SCAN !== undefined) {
      process.env.BNY_SECRETS_SCAN = saved_env.BNY_SECRETS_SCAN
    } else {
      delete process.env.BNY_SECRETS_SCAN
    }
  })

  test("clean text returns no matches", () => {
    const matches = scan_secrets("This is a normal README file.\nNo secrets here.")
    expect(matches).toEqual([])
  })

  test("detects .env style secrets", () => {
    const matches = scan_secrets("API_SECRET_KEY=sk-12345abcdef")
    expect(matches.length).toBe(1)
    expect(matches[0].kind).toBe("env-secret")
  })

  test("detects AWS access keys", () => {
    const matches = scan_secrets("key: AKIAIOSFODNN7EXAMPLE")
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === "aws-access-key")).toBe(true)
  })

  test("detects GitHub tokens", () => {
    const matches = scan_secrets("token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn")
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === "github-token")).toBe(true)
  })

  test("detects OpenAI keys", () => {
    const matches = scan_secrets("OPENAI_KEY=sk-abcdefghijklmnopqrstuvwx")
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === "openai-key")).toBe(true)
  })

  test("detects Anthropic keys", () => {
    const matches = scan_secrets("key: sk-ant-abcdefghijklmnopqrstuvwx")
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === "anthropic-key")).toBe(true)
  })

  test("detects private keys", () => {
    const matches = scan_secrets("-----BEGIN RSA PRIVATE KEY-----\nMIIE...")
    expect(matches.length).toBe(1)
    expect(matches[0].kind).toBe("private-key")
  })

  test("detects connection strings with passwords", () => {
    const matches = scan_secrets("DATABASE_URL=postgres://user:secretpass@localhost:5432/db")
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === "connection-string")).toBe(true)
  })

  test("detects api_key assignments", () => {
    const matches = scan_secrets('config.api_key = "abcdefghijklmnopqrstuvwxyz1234"')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === "api-key")).toBe(true)
  })

  test("detects Stripe keys", () => {
    const matches = scan_secrets("stripe_key: sk_test_abcdefghijklmnopqrstuvwxyz")
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === "stripe-key")).toBe(true)
  })

  test("detects Slack tokens", () => {
    const matches = scan_secrets("SLACK_TOKEN=xoxb-1234567890-abcdefghij")
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === "slack-token")).toBe(true)
  })

  test("detects password assignments", () => {
    const matches = scan_secrets('password = "my_super_secret_pass"')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === "password")).toBe(true)
  })

  test("detects Bearer auth headers", () => {
    const matches = scan_secrets("Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123")
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === "auth-header")).toBe(true)
  })

  test("reports correct line numbers", () => {
    const matches = scan_secrets("line one\nline two\nghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn\nline four")
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches[0].line).toBe(3)
  })

  test("truncates long snippets", () => {
    const matches = scan_secrets("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrs")
    expect(matches.length).toBeGreaterThanOrEqual(1)
    // snippet should be truncated with ... in the middle
    expect(matches[0].snippet.length).toBeLessThan(50)
  })

  test("disabled with BNY_SECRETS_SCAN=off", () => {
    process.env.BNY_SECRETS_SCAN = "off"
    const matches = scan_secrets("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn")
    expect(matches).toEqual([])
  })

  test("multiple secrets on different lines", () => {
    const text = [
      "API_SECRET_KEY=abc123456789",
      "normal line",
      "password = supersecretvalue",
    ].join("\n")
    const matches = scan_secrets(text)
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })
})

describe("check_secrets", () => {
  const saved_env: Record<string, string | undefined> = {}

  beforeEach(() => {
    saved_env.BNY_SECRETS_SCAN = process.env.BNY_SECRETS_SCAN
    saved_env.BNY_SECRETS_BLOCK = process.env.BNY_SECRETS_BLOCK
    delete process.env.BNY_SECRETS_SCAN
    delete process.env.BNY_SECRETS_BLOCK
  })

  afterEach(() => {
    for (const [key, val] of Object.entries(saved_env)) {
      if (val !== undefined) process.env[key] = val
      else delete process.env[key]
    }
  })

  test("returns true for clean text", () => {
    expect(check_secrets("no secrets here", "test")).toBe(true)
  })

  test("returns true (warn only) by default when secrets found", () => {
    expect(check_secrets("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn", "test")).toBe(true)
  })

  test("returns false when BNY_SECRETS_BLOCK=1 and secrets found", () => {
    process.env.BNY_SECRETS_BLOCK = "1"
    expect(check_secrets("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn", "test")).toBe(false)
  })
})
