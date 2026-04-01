//
// gh.ts — github PRs as pipeline state
//
// the PR IS the build. the branch IS the anchor. comments are the
// progress narrative. labels are the state machine. the diff is the output.
//
// flow:
//   1. bny hop creates feature branch + draft PR
//   2. each phase commits artifacts + posts PR comment
//   3. completion marks PR ready for review
//   4. human merges (or --yes auto-merges)
//
// resume: gh pr view from current branch → read comments → resume
//
// all functions use `gh` CLI via spawn_sync. if gh is down,
// pipeline fails — same as if git is down.
//

import { spawn_sync, which_check } from "./spawn.ts"
import { find_root } from "./feature.ts"

// -- constants --

const LABEL_NAMESPACE = "bunny"
const LABEL_VERSION   = "bunny:v1"
const LABEL_PROGRESS  = "in-progress"
const LABEL_DONE      = "done"
const LABEL_FAILED    = "failed"
const LABEL_STUCK     = "stuck"

const PHASE_LABELS = ["phase:spec", "phase:plan", "phase:test", "phase:build"] as const

const ALL_STATE_LABELS = [LABEL_PROGRESS, LABEL_DONE, LABEL_FAILED, LABEL_STUCK] as const

const ALL_LABELS = [
  LABEL_NAMESPACE,
  LABEL_VERSION,
  ...ALL_STATE_LABELS,
  ...PHASE_LABELS,
  "type:hop",
  "type:spike",
]

// -- types --

export interface PhaseDetail {
  phase:       string
  status:      "completed" | "failed"
  duration_ms: number
  artifacts:   string[]
  summary:     string
  error:       string | null
}

// -- sanitizer --

function sanitize(text: string): string {
  let out = text.replace(/\/home\/[^\s/]+/g, "~")
  out = out.replace(/\/tmp\/[^\s]+/g, "/tmp/...")
  out = out.replace(/sk-ant-[a-zA-Z0-9_-]+/g, "sk-ant-***")
  out = out.replace(/ghp_[a-zA-Z0-9]+/g, "ghp_***")
  out = out.replace(/gho_[a-zA-Z0-9]+/g, "gho_***")
  out = out.replace(/AKIA[A-Z0-9]{16}/g, "AKIA***")
  out = out.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer ***")

  if (out.length > 8000) {
    out = out.slice(0, 7500) + "\n\n...(truncated, " + text.length + " chars total)"
  }

  return out
}

// -- gh CLI helpers --

function gh_available(): boolean {
  return which_check("gh")
}

function gh(args: string[], opts?: { stdin?: string }): { ok: boolean, stdout: string, stderr: string } {
  const r = spawn_sync({
    cmd: ["gh", ...args],
    cwd: find_root(),
    label: "gh",
    timeout: 30_000,
    stdin: opts?.stdin ? Buffer.from(opts.stdin) : undefined,
  })
  return {
    ok: r.ok,
    stdout: r.stdout?.trim() ?? "",
    stderr: r.detail?.trim() ?? "",
  }
}

// -- label management --

export function ensure_labels(): void {
  if (!gh_available()) return

  const colors: Record<string, string> = {
    [LABEL_NAMESPACE]: "7B68EE",
    [LABEL_VERSION]:   "6A5ACD",
    [LABEL_PROGRESS]:  "FFA500",
    [LABEL_DONE]:      "2E8B57",
    [LABEL_FAILED]:    "DC143C",
    [LABEL_STUCK]:     "FF4500",
    "phase:spec":      "87CEEB",
    "phase:plan":      "87CEEB",
    "phase:test":      "87CEEB",
    "phase:build":     "87CEEB",
    "type:hop":        "DDA0DD",
    "type:spike":      "DDA0DD",
  }

  for (const label of ALL_LABELS) {
    const color = colors[label] || "CCCCCC"
    gh(["label", "create", label, "--color", color, "--force"])
  }
}

function set_labels(pr_num: number, add: string[], remove: string[]): void {
  for (const label of remove) {
    gh(["pr", "edit", String(pr_num), "--remove-label", label])
  }
  if (add.length > 0) {
    gh(["pr", "edit", String(pr_num), "--add-label", add.join(",")])
  }
}

function set_phase_label(pr_num: number, phase: string): void {
  const remove = PHASE_LABELS.filter(l => l !== `phase:${phase}`) as string[]
  set_labels(pr_num, [`phase:${phase}`], remove)
}

function set_state_label(pr_num: number, state: typeof ALL_STATE_LABELS[number]): void {
  const remove = ALL_STATE_LABELS.filter(l => l !== state) as string[]
  set_labels(pr_num, [state], remove)
}

// -- current branch --

function current_branch(): string | null {
  const r = spawn_sync({ cmd: ["git", "rev-parse", "--abbrev-ref", "HEAD"], label: "git" })
  if (!r.ok || !r.stdout) return null
  const branch = r.stdout.trim()
  return branch === "HEAD" ? null : branch
}

function current_sha(): string {
  const r = spawn_sync({ cmd: ["git", "rev-parse", "--short", "HEAD"], label: "git" })
  return r.ok && r.stdout ? r.stdout.trim() : "unknown"
}

// -- public API --

/**
 * create a draft PR for the current branch.
 * returns the PR number, or null on failure.
 */
export function create_pipeline_pr(opts: {
  description: string
  pipeline:    string
  base?:       string
}): number | null {
  if (!gh_available()) return null

  ensure_labels()

  const branch = current_branch()
  if (!branch) {
    process.stderr.write("warning: not on a branch, cannot create PR\n")
    return null
  }

  // push the branch first (PR needs a remote branch)
  const push_r = spawn_sync({ cmd: ["git", "push", "-u", "origin", branch], label: "git push" })
  if (!push_r.ok) {
    process.stderr.write(`warning: git push failed: ${push_r.detail}\n`)
    return null
  }

  const type_label = `type:${opts.pipeline}`
  const title = `${opts.pipeline}: ${opts.description.slice(0, 120)}`
  const base = opts.base || "main"

  const body = [
    `**Pipeline**: ${opts.pipeline}`,
    `**Branch**: \`${branch}\``,
    `**SHA**: ${current_sha()}`,
    `**Started**: ${new Date().toISOString()}`,
    "",
    "## Description",
    "",
    opts.description,
    "",
    "## Phases",
    "",
    "- [ ] spec (specify + challenge)",
    "- [ ] plan (plan + tasks)",
    "- [ ] test (3×3 narrowing)",
    "- [ ] build (implement + verify + retro + ruminate)",
  ].join("\n")

  const r = gh([
    "pr", "create",
    "--draft",
    "--title", title,
    "--body", body,
    "--base", base,
    "--label", [LABEL_NAMESPACE, LABEL_VERSION, LABEL_PROGRESS, type_label, "phase:spec"].join(","),
  ])

  if (!r.ok) {
    process.stderr.write(`warning: could not create PR: ${r.stderr}\n`)
    return null
  }

  // gh pr create returns the URL — extract the number
  const m = r.stdout.match(/\/pull\/(\d+)/)
  if (!m) {
    process.stderr.write(`warning: could not parse PR number from: ${r.stdout}\n`)
    return null
  }

  const pr_num = parseInt(m[1], 10)
  process.stderr.write(`[gh] created draft PR #${pr_num}\n`)
  return pr_num
}

/**
 * find the active pipeline PR for the current branch.
 * returns PR number or null.
 */
export function find_active_pr(): number | null {
  if (!gh_available()) return null

  const branch = current_branch()
  if (!branch) return null

  // check for PR on this branch
  const r = gh([
    "pr", "view",
    "--json", "number,state,labels",
    "--jq", ".number",
  ])

  if (!r.ok || !r.stdout) return null

  const n = parseInt(r.stdout, 10)
  return isNaN(n) ? null : n
}

/**
 * post a phase completion/failure comment on the PR.
 */
export function post_phase_comment(pr_num: number, detail: PhaseDetail): void {
  if (!gh_available()) return

  const icon = detail.status === "completed" ? "✓" : "✗"
  const duration = detail.duration_ms > 0
    ? `${(detail.duration_ms / 1000).toFixed(1)}s`
    : "—"

  const parts = [
    `## phase: ${detail.phase} ${icon}`,
    "",
    `**Status**: ${detail.status}`,
    `**Duration**: ${duration}`,
  ]

  if (detail.artifacts.length > 0) {
    parts.push(`**Artifacts**: ${detail.artifacts.join(", ")}`)
  }

  if (detail.summary) {
    parts.push("", detail.summary)
  }

  if (detail.error) {
    parts.push("", "### Error", "", "```", sanitize(detail.error), "```")
  }

  const body = parts.join("\n")
  gh(["pr", "comment", String(pr_num), "--body", body])
}

/**
 * post a sprint contract comment before test-gen.
 */
export function post_contract_comment(pr_num: number, round: number, contract: string): void {
  if (!gh_available()) return

  const body = [
    `## sprint contract: round ${round}`,
    "",
    sanitize(contract),
  ].join("\n")

  gh(["pr", "comment", String(pr_num), "--body", body])
}

/**
 * update the PR body's phase checklist and labels.
 */
export function update_pipeline_phase(pr_num: number, phase: string, completed_phase?: string): void {
  if (!gh_available()) return

  // update phase label
  set_phase_label(pr_num, phase)

  // check off completed phase in the body
  if (completed_phase) {
    const r = gh(["pr", "view", String(pr_num), "--json", "body", "--jq", ".body"])
    if (!r.ok) return

    const patterns: Record<string, string> = {
      spec:  "- [ ] spec",
      plan:  "- [ ] plan",
      test:  "- [ ] test",
      build: "- [ ] build",
    }

    const p = patterns[completed_phase]
    if (p && r.stdout.includes(p)) {
      const new_body = r.stdout.replace(p, p.replace("[ ]", "[x]"))
      gh(["pr", "edit", String(pr_num), "--body", new_body])
    }
  }
}

/**
 * close the pipeline PR — mark done or failed.
 */
export function close_pipeline_pr(pr_num: number, summary: string, success: boolean): void {
  if (!gh_available()) return

  const label = success ? LABEL_DONE : LABEL_FAILED
  const icon = success ? "✓" : "✗"

  const body = [
    `## ${success ? "complete" : "failed"} ${icon}`,
    "",
    sanitize(summary),
  ].join("\n")

  gh(["pr", "comment", String(pr_num), "--body", body])
  set_state_label(pr_num, label)

  if (success) {
    // mark ready for review (remove draft)
    gh(["pr", "ready", String(pr_num)])
  }
}

/**
 * mark the pipeline as stuck — needs human intervention.
 */
export function mark_stuck(pr_num: number, reason: string): void {
  if (!gh_available()) return

  const body = [
    "## stuck — needs human",
    "",
    sanitize(reason),
  ].join("\n")

  gh(["pr", "comment", String(pr_num), "--body", body])
  set_state_label(pr_num, LABEL_STUCK)
}

/**
 * read PR context for injecting into LLM prompts.
 * returns body + recent comments (sliding window).
 */
export function read_pr_context(pr_num: number, max_comments?: number): string | null {
  if (!gh_available()) return null

  const limit = max_comments ?? 10

  const body_r = gh(["pr", "view", String(pr_num), "--json", "title,body", "--jq", ".title + \"\\n\\n\" + .body"])
  if (!body_r.ok) return null

  const comments_r = gh(["pr", "view", String(pr_num), "--json", "comments",
    "--jq", `.comments | .[-${limit}:] | .[].body`])

  const parts = [
    `## Build Context (PR #${pr_num})`,
    "",
    body_r.stdout,
  ]

  if (comments_r.ok && comments_r.stdout) {
    parts.push("", "---", "", "## Recent Progress", "", comments_r.stdout)
  }

  return sanitize(parts.join("\n"))
}
