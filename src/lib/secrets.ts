//
// bny/lib/secrets.ts — detect secrets in text before sending to LLMs
//
// scans for common secret patterns (API keys, tokens, passwords, .env values).
// warns on stderr by default, blocks if BNY_SECRETS_BLOCK=1.
// disable entirely with BNY_SECRETS_SCAN=off.
//

export interface SecretMatch {
  kind:    string
  line:    number
  snippet: string
}

// patterns: [label, regex]
// regexes are designed to minimize false positives while catching real secrets
const PATTERNS: [string, RegExp][] = [
  // .env style: KEY=value (only when value looks secret-ish)
  ["env-secret",       /^[A-Z][A-Z0-9_]*(SECRET|TOKEN|PASSWORD|KEY|CREDENTIAL|AUTH)[A-Z0-9_]*\s*=\s*\S+/],

  // AWS
  ["aws-access-key",   /\bAKIA[0-9A-Z]{16}\b/],
  ["aws-secret-key",   /\b[A-Za-z0-9/+=]{40}\b(?=.*(?:aws|secret|key))/i],

  // generic API key patterns (long hex/base64 after key-like prefix)
  ["api-key",          /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[A-Za-z0-9_\-]{20,}["']?/i],
  ["api-token",        /(?:api[_-]?token|bearer)\s*[:=]\s*["']?[A-Za-z0-9_\-\.]{20,}["']?/i],
  ["auth-header",      /Authorization:\s*Bearer\s+[A-Za-z0-9_\-\.]{20,}/i],

  // private keys
  ["private-key",      /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/],

  // common provider patterns
  ["github-token",     /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b/],
  ["slack-token",      /\bxox[bprs]-[A-Za-z0-9\-]{10,}\b/],
  ["stripe-key",       /\b[sr]k_(?:live|test)_[A-Za-z0-9]{20,}\b/],
  ["openai-key",       /\bsk-[A-Za-z0-9]{20,}\b/],
  ["anthropic-key",    /\bsk-ant-[A-Za-z0-9_\-]{20,}\b/],

  // generic password in config
  ["password",         /(?:password|passwd|pwd)\s*[:=]\s*["']?[^\s"']{8,}["']?/i],

  // connection strings with credentials
  ["connection-string", /(?:mongodb|postgres|mysql|redis):\/\/[^:]+:[^@]+@/i],
]

export function scan_secrets(text: string): SecretMatch[] {
  if (process.env.BNY_SECRETS_SCAN === "off") return []

  const matches: SecretMatch[] = []
  const lines = text.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const [kind, pattern] of PATTERNS) {
      const m = pattern.exec(line)
      if (m) {
        // truncate the matched text for display (don't echo the full secret)
        const raw = m[0]
        const snippet = raw.length > 20
          ? raw.slice(0, 10) + "..." + raw.slice(-4)
          : raw
        matches.push({ kind, line: i + 1, snippet })
      }
    }
  }

  return matches
}

export function check_secrets(text: string, label: string): boolean {
  const matches = scan_secrets(text)
  if (matches.length === 0) return true

  process.stderr.write(`\nwarning: potential secrets detected in ${label}:\n`)
  for (const m of matches) {
    process.stderr.write(`  line ${m.line}: ${m.kind} — ${m.snippet}\n`)
  }

  if (process.env.BNY_SECRETS_BLOCK === "1") {
    process.stderr.write(`\nblocked: set BNY_SECRETS_BLOCK=0 or BNY_SECRETS_SCAN=off to override\n`)
    return false
  }

  process.stderr.write(`\n(set BNY_SECRETS_BLOCK=1 to block, BNY_SECRETS_SCAN=off to disable)\n`)
  return true
}
