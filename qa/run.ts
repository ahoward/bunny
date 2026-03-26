#!/usr/bin/env bun
//
// qa/run.ts — bunny QA harness
//
// treats bny as a black box. builds three canonical apps,
// evaluates output with adversarial claude + gemini reviews,
// tracks KPIs over time.
//
// usage:
//   bun qa/run.ts                  # run all 3 benchmarks
//   bun qa/run.ts --suite semver   # run one
//   bun qa/run.ts --list           # show available suites
//   bun qa/run.ts --history        # show KPI history
//   bun qa/run.ts --compare        # compare last 2 runs
//   bun qa/run.ts --summary        # latest score per suite vs baseline
//   bun qa/run.ts --baseline       # snapshot current scores as baseline
//

import { mkdtempSync, mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, rmSync, cpSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve, dirname } from "node:path"

// -- types --

interface Suite {
  name:        string
  prompt:      string
  category:    string  // "algorithm" | "io_state" | "protocol"
}

interface Scores {
  correctness:    number  // 1-5: do tests pass? are they right?
  test_quality:   number  // 1-5: adversarial or softballs?
  code_quality:   number  // 1-5: idiomatic, simple, mergeable?
  spec_fidelity:  number  // 1-5: does code match the spec?
  defect_count:   number  // bugs found that tests missed
}

interface Evaluation {
  reviewer:     "claude" | "gemini"
  scores:       Scores
  defects:      string[]    // descriptions of bugs found
  soft_tests:   string[]    // tests that are softballs
  missing_tests: string[]   // scenarios that should be tested
  summary:      string
}

interface BuildResult {
  suite:          string
  exit_code:      number
  duration_ms:    number
  test_count:     number
  source_files:   string[]
  test_files:     string[]
  source_lines:   number
  test_lines:     number
  source_content: string
  test_content:   string
  spec_content:   string | null
  plan_content:   string | null
}

interface RunResult {
  suite:        string
  build:        BuildResult
  evaluations:  Evaluation[]
  composite:    CompositeScore
  timestamp:    string
  bny_version:  string
  git_sha:      string
}

interface CompositeScore {
  correctness:    number  // avg of both reviewers
  test_quality:   number
  code_quality:   number
  spec_fidelity:  number
  defect_count:   number  // total unique defects
  overall:        number  // weighted composite
}

interface HistoryEntry {
  timestamp:   string
  git_sha:     string
  bny_version: string
  suites:      Record<string, CompositeScore>
  aggregate:   CompositeScore
}

// -- suites --

const SUITES: Suite[] = [
  {
    name: "semver",
    prompt: "a library that parses semver ranges (^, ~, >=, ||, hyphen, x-ranges) and checks if a version satisfies a range",
    category: "algorithm",
  },
  {
    name: "kv-store",
    prompt: "an HTTP key-value store with TTL expiry, GET/PUT/DELETE endpoints, and JSON responses",
    category: "io_state",
  },
  {
    name: "json-patch",
    prompt: "RFC 6902 JSON Patch — add, remove, replace, move, copy, test operations with atomic rollback on failure",
    category: "protocol",
  },
]

// -- constants --

const QA_DIR       = dirname(import.meta.path)
const ROOT         = resolve(QA_DIR, "..")
const DATA_DIR     = join(QA_DIR, "data")
const BASELINE_PATH = join(QA_DIR, "baseline.json")
const BNY          = resolve(ROOT, "bin/bny.ts")

// -- helpers --

function run_cmd(cmd: string[], opts: { cwd?: string, timeout?: number } = {}): { stdout: string, stderr: string, exit: number, duration_ms: number } {
  const start = performance.now()
  const proc = Bun.spawnSync(cmd, {
    stdout: "pipe",
    stderr: "pipe",
    cwd: opts.cwd ?? process.cwd(),
    timeout: opts.timeout ?? 600_000,  // 10 min default
    env: { ...process.env, BUNNY_LOG: "0", BNY_NO_SPINNER: "1" },
  })
  return {
    stdout: new TextDecoder().decode(proc.stdout).trim(),
    stderr: new TextDecoder().decode(proc.stderr).trim(),
    exit: proc.exitCode ?? 1,
    duration_ms: Math.round(performance.now() - start),
  }
}

function call_claude(prompt: string): string {
  const result = run_cmd(["claude", "-p", "--output-format", "json", "-"], {
    timeout: 120_000,
  })
  // claude -p reads from... we need to write to stdin
  const proc = Bun.spawnSync(["claude", "-p", "--output-format", "text", "-"], {
    stdout: "pipe",
    stderr: "pipe",
    stdin: new TextEncoder().encode(prompt),
    timeout: 120_000,
  })
  return new TextDecoder().decode(proc.stdout).trim()
}

function call_gemini(prompt: string): string {
  const tmp = join(tmpdir(), `qa-gemini-${process.pid}-${Date.now()}.txt`)
  writeFileSync(tmp, prompt)
  try {
    const proc = Bun.spawnSync(["gemini", "-p", ""], {
      stdout: "pipe",
      stderr: "pipe",
      stdin: Bun.file(tmp),
      timeout: 120_000,
    })
    return new TextDecoder().decode(proc.stdout).trim()
  } finally {
    try { rmSync(tmp) } catch {}
  }
}

function call_llm_json<T>(caller: "claude" | "gemini", prompt: string): T | null {
  const json_prompt = prompt + "\n\nRespond with ONLY valid JSON. No markdown fences, no commentary."
  const raw = caller === "claude" ? call_claude(json_prompt) : call_gemini(json_prompt)

  // strip markdown fences if present
  let cleaned = raw
  const fence_match = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fence_match) cleaned = fence_match[1]

  try {
    return JSON.parse(cleaned) as T
  } catch {
    process.stderr.write(`warning: ${caller} returned unparseable JSON, retrying...\n`)
    // one retry with stronger prompt
    const retry_raw = caller === "claude"
      ? call_claude(json_prompt + "\n\nYour previous response was not valid JSON. Return ONLY the JSON object.")
      : call_gemini(json_prompt + "\n\nYour previous response was not valid JSON. Return ONLY the JSON object.")
    const retry_match = retry_raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    const retry_cleaned = retry_match ? retry_match[1] : retry_raw
    try {
      return JSON.parse(retry_cleaned) as T
    } catch {
      process.stderr.write(`error: ${caller} failed to return valid JSON after retry\n`)
      return null
    }
  }
}

function count_lines(text: string): number {
  return text.split("\n").length
}

function collect_files(dir: string, pattern: RegExp): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && pattern.test(entry.name)) {
      const full = join(entry.parentPath ?? dir, entry.name)
      results.push(full)
    }
  }
  return results
}

function read_files(paths: string[]): string {
  return paths.map(p => {
    const content = readFileSync(p, "utf-8")
    return `--- ${p} ---\n${content}`
  }).join("\n\n")
}

function get_bny_version(): { version: string, git_sha: string } {
  const r = run_cmd(["bun", BNY, "version"])
  try {
    const data = JSON.parse(r.stdout)
    return { version: data.version ?? "unknown", git_sha: data.git_sha ?? "unknown" }
  } catch {
    return { version: "unknown", git_sha: "unknown" }
  }
}

// -- build --

function build_suite(suite: Suite): BuildResult {
  const work_dir = mkdtempSync(join(tmpdir(), `bny-qa-${suite.name}-`))

  process.stderr.write(`\n  building in ${work_dir}\n`)

  // init a git repo with a minimal bun/typescript project
  run_cmd(["git", "init"], { cwd: work_dir })
  writeFileSync(join(work_dir, "package.json"), JSON.stringify({
    name: `qa-${suite.name}`,
    version: "0.0.1",
    type: "module",
  }, null, 2))
  writeFileSync(join(work_dir, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "esnext",
      module: "esnext",
      moduleResolution: "bundler",
      strict: true,
      skipLibCheck: true,
      types: ["bun-types"],
    },
  }, null, 2))
  run_cmd(["git", "add", "."], { cwd: work_dir })
  run_cmd(["git", "commit", "-m", "init"], { cwd: work_dir })

  // run bny hop
  const start = performance.now()
  const hop = Bun.spawnSync(["bun", BNY, "hop", suite.prompt], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: work_dir,
    timeout: 1_800_000,  // 30 min for full pipeline (loop-until-green needs headroom)
    env: { ...process.env, BUNNY_LOG: "0", BNY_NO_SPINNER: "1" },
  })
  const duration_ms = Math.round(performance.now() - start)
  const exit_code = hop.exitCode ?? 1

  // collect artifacts — search broadly for source and test files
  const code_pattern = /\.(ts|js|py|rs|go|rb)$/
  const exclude = (f: string) => !f.includes("/node_modules/") && !f.includes("/bny/") && !f.includes("/.git/")
  const all_code = collect_files(work_dir, code_pattern).filter(exclude)

  const test_files = all_code.filter(f => f.includes("/tests/") || f.includes("/test/") || f.includes("_test.") || f.includes(".test.") || f.includes(".spec."))
  const test_set = new Set(test_files)
  const source_files = all_code.filter(f => !test_set.has(f))

  const source_content = read_files(source_files)
  const test_content = read_files(test_files)
  const source_lines = source_files.reduce((n, f) => n + count_lines(readFileSync(f, "utf-8")), 0)
  const test_lines = test_files.reduce((n, f) => n + count_lines(readFileSync(f, "utf-8")), 0)

  // count tests (rough: count "test(" or "it(" or "#[test]" or "func Test" etc.)
  const test_count = (test_content.match(/\b(test|it)\s*\(/g) || []).length
    + (test_content.match(/#\[test\]/g) || []).length
    + (test_content.match(/func Test/g) || []).length
    + (test_content.match(/def test_/g) || []).length

  // try to find spec and plan
  const specs_dir = join(work_dir, "specs")
  let spec_content: string | null = null
  let plan_content: string | null = null
  if (existsSync(specs_dir)) {
    const spec_files = collect_files(specs_dir, /spec\.md$/)
    if (spec_files.length > 0) spec_content = readFileSync(spec_files[0], "utf-8")
    const plan_files = collect_files(specs_dir, /plan\.md$/)
    if (plan_files.length > 0) plan_content = readFileSync(plan_files[0], "utf-8")
  }

  return {
    suite: suite.name,
    exit_code,
    duration_ms,
    test_count,
    source_files: source_files.map(f => f.replace(work_dir + "/", "")),
    test_files: test_files.map(f => f.replace(work_dir + "/", "")),
    source_lines,
    test_lines,
    source_content,
    test_content,
    spec_content,
    plan_content,
  }
}

// -- evaluate --

const EVAL_SCHEMA = `{
  "scores": {
    "correctness": 3,
    "test_quality": 3,
    "code_quality": 3,
    "spec_fidelity": 3,
    "defect_count": 0
  },
  "defects": ["description of each bug found"],
  "soft_tests": ["tests that are too easy / don't test real behavior"],
  "missing_tests": ["scenarios that should be tested but aren't"],
  "summary": "2-3 sentence assessment"
}`

function build_eval_prompt(build: BuildResult, suite: Suite): string {
  return `You are a senior engineer doing a ruthless code review.

This code was generated by an AI pipeline from this prompt:
"${suite.prompt}"

Your job: find bugs the tests miss. Find tests that are softballs. Find missing coverage. Be adversarial.

${build.spec_content ? `## Spec\n${build.spec_content}\n` : ""}
## Source Code
${build.source_content || "(no source files found)"}

## Tests
${build.test_content || "(no test files found)"}

## Build Info
- exit code: ${build.exit_code}
- test count: ${build.test_count}
- source lines: ${build.source_lines}
- test lines: ${build.test_lines}

## Scoring

Rate 1-5 (1=terrible, 5=excellent):
- correctness: do the tests pass for the right reasons? is the logic correct?
- test_quality: are these real adversarial tests or softballs? do they test edge cases?
- code_quality: is this idiomatic, simple, mergeable? would you approve this PR?
- spec_fidelity: does the code match what was asked for, or did it drift?
- defect_count: how many actual bugs did you find that the tests don't catch?

For each defect, explain the bug and why the tests miss it.
For each soft test, explain what it fails to actually verify.
For each missing test, explain the scenario and why it matters.

Respond ONLY with valid JSON. No markdown fences, no commentary. Use the exact structure below, replacing the placeholder numbers with your actual scores (1-5 scale):
${EVAL_SCHEMA}`
}

function evaluate(build: BuildResult, suite: Suite, reviewer: "claude" | "gemini"): Evaluation {
  process.stderr.write(`    ${reviewer} reviewing...\n`)
  const prompt = build_eval_prompt(build, suite)

  const result = call_llm_json<{
    scores: Scores
    defects: string[]
    soft_tests: string[]
    missing_tests: string[]
    summary: string
  }>(reviewer, prompt)

  if (!result) {
    process.stderr.write(`    warning: ${reviewer} evaluation failed, using zeroes\n`)
    return {
      reviewer,
      scores: { correctness: 0, test_quality: 0, code_quality: 0, spec_fidelity: 0, defect_count: 0 },
      defects: [],
      soft_tests: [],
      missing_tests: [],
      summary: "evaluation failed",
    }
  }

  return {
    reviewer,
    scores: result.scores,
    defects: result.defects ?? [],
    soft_tests: result.soft_tests ?? [],
    missing_tests: result.missing_tests ?? [],
    summary: result.summary ?? "",
  }
}

// -- composite --

function compute_composite(evals: Evaluation[]): CompositeScore {
  const avg = (key: keyof Scores) => {
    const vals = evals.map(e => e.scores[key]).filter(v => v > 0)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }

  // unique defects (deduplicate across reviewers)
  const all_defects = evals.flatMap(e => e.defects)
  const defect_count = all_defects.length

  const correctness = avg("correctness")
  const test_quality = avg("test_quality")
  const code_quality = avg("code_quality")
  const spec_fidelity = avg("spec_fidelity")

  // weighted composite: correctness matters most, defects are penalties
  const overall = (
    correctness   * 0.30 +
    test_quality  * 0.25 +
    code_quality  * 0.20 +
    spec_fidelity * 0.25
  ) - (defect_count * 0.1)

  return {
    correctness:  Math.round(correctness * 10) / 10,
    test_quality: Math.round(test_quality * 10) / 10,
    code_quality: Math.round(code_quality * 10) / 10,
    spec_fidelity: Math.round(spec_fidelity * 10) / 10,
    defect_count,
    overall: Math.round(Math.max(0, overall) * 100) / 100,
  }
}

// -- history --

function ensure_data_dir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function save_run(results: RunResult[]): string {
  ensure_data_dir()
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const sha = results[0]?.git_sha ?? "unknown"
  const filename = `${ts}_${sha.slice(0, 7)}.json`
  const path = join(DATA_DIR, filename)

  const entry: HistoryEntry = {
    timestamp: results[0]?.timestamp ?? new Date().toISOString(),
    git_sha: sha,
    bny_version: results[0]?.bny_version ?? "unknown",
    suites: {},
    aggregate: { correctness: 0, test_quality: 0, code_quality: 0, spec_fidelity: 0, defect_count: 0, overall: 0 },
  }

  for (const r of results) {
    entry.suites[r.suite] = r.composite
  }

  // aggregate across suites
  const composites = results.map(r => r.composite)
  const avg = (key: keyof CompositeScore) => {
    const vals = composites.map(c => c[key])
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }
  entry.aggregate = {
    correctness:  Math.round(avg("correctness") * 10) / 10,
    test_quality: Math.round(avg("test_quality") * 10) / 10,
    code_quality: Math.round(avg("code_quality") * 10) / 10,
    spec_fidelity: Math.round(avg("spec_fidelity") * 10) / 10,
    defect_count: Math.round(avg("defect_count")),
    overall:      Math.round(avg("overall") * 100) / 100,
  }

  // save full results + summary
  writeFileSync(path, JSON.stringify({ summary: entry, runs: results }, null, 2))

  // also save individual run details
  for (const r of results) {
    const detail_path = join(DATA_DIR, `${ts}_${sha.slice(0, 7)}_${r.suite}.json`)
    writeFileSync(detail_path, JSON.stringify(r, null, 2))
  }

  return path
}

function load_history(): HistoryEntry[] {
  ensure_data_dir()
  const files = readdirSync(DATA_DIR)
    .filter(f => f.endsWith(".json") && !f.includes("_semver") && !f.includes("_kv-store") && !f.includes("_json-patch"))
    .sort()

  return files.map(f => {
    const data = JSON.parse(readFileSync(join(DATA_DIR, f), "utf-8"))
    return data.summary as HistoryEntry
  })
}

function pad(s: string, n: number): string { return s.padEnd(n) }

function print_history(): void {
  const history = load_history()
  if (history.length === 0) {
    process.stderr.write("no runs yet.\n")
    return
  }

  console.log("\n  bny QA history\n")
  console.log(`  ${pad("timestamp", 22)} ${pad("sha", 8)} ${pad("corr", 6)} ${pad("test", 6)} ${pad("code", 6)} ${pad("spec", 6)} ${pad("def", 4)} overall`)
  console.log("  " + "-".repeat(72))

  for (const h of history) {
    const a = h.aggregate
    const idx = history.indexOf(h)
    const delta = idx > 0 ? (a.overall - history[idx - 1].aggregate.overall) : 0
    const arrow = delta > 0 ? ` (+${delta.toFixed(2)})` : delta < 0 ? ` (${delta.toFixed(2)})` : ""
    console.log(`  ${pad(h.timestamp.slice(0, 19), 22)} ${pad(h.git_sha.slice(0, 7), 8)} ${pad(a.correctness.toFixed(1), 6)} ${pad(a.test_quality.toFixed(1), 6)} ${pad(a.code_quality.toFixed(1), 6)} ${pad(a.spec_fidelity.toFixed(1), 6)} ${pad(String(a.defect_count), 4)} ${a.overall.toFixed(2)}${arrow}`)
  }
  console.log()
}

function print_compare(): void {
  const history = load_history()
  if (history.length < 2) {
    process.stderr.write("need at least 2 runs to compare.\n")
    return
  }

  const prev = history[history.length - 2]
  const curr = history[history.length - 1]

  console.log(`\n  comparing: ${prev.git_sha.slice(0, 7)} → ${curr.git_sha.slice(0, 7)}\n`)

  const dims: (keyof CompositeScore)[] = ["correctness", "test_quality", "code_quality", "spec_fidelity", "defect_count", "overall"]

  for (const dim of dims) {
    const p = prev.aggregate[dim]
    const c = curr.aggregate[dim]
    const delta = c - p
    const dir = dim === "defect_count"
      ? (delta < 0 ? "  (better)" : delta > 0 ? "  (worse)" : "")
      : (delta > 0 ? "  (better)" : delta < 0 ? "  (worse)" : "")
    const sign = delta >= 0 ? "+" : ""
    console.log(`  ${pad(dim, 15)} ${pad(p.toFixed(1), 6)} → ${pad(c.toFixed(1), 6)}  ${sign}${delta.toFixed(1)}${dir}`)
  }

  // per-suite breakdown
  const all_suites = new Set([...Object.keys(prev.suites), ...Object.keys(curr.suites)])
  for (const suite of all_suites) {
    const ps = prev.suites[suite]
    const cs = curr.suites[suite]
    if (!ps || !cs) continue
    console.log(`\n  ${suite}:`)
    for (const dim of dims) {
      const delta = cs[dim] - ps[dim]
      if (Math.abs(delta) > 0.05) {
        const dir = dim === "defect_count"
          ? (delta < 0 ? "better" : "worse")
          : (delta > 0 ? "better" : "worse")
        const sign = delta >= 0 ? "+" : ""
        console.log(`    ${pad(dim, 15)} ${sign}${delta.toFixed(1)} (${dir})`)
      }
    }
  }
  console.log()
}

// -- baseline --

interface Baseline {
  timestamp:    string
  git_sha:      string
  bny_version:  string
  suites:       Record<string, CompositeScore>
  aggregate:    CompositeScore
}

function load_baseline(): Baseline | null {
  if (!existsSync(BASELINE_PATH)) return null
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) as Baseline
  } catch {
    return null
  }
}

function save_baseline(): void {
  const history = load_history()
  if (history.length === 0) {
    process.stderr.write("no runs yet — run suites first.\n")
    return
  }

  // build baseline from latest score for each suite across all runs
  const latest_by_suite: Record<string, { score: CompositeScore, entry: HistoryEntry }> = {}
  for (const h of history) {
    for (const [suite, score] of Object.entries(h.suites)) {
      latest_by_suite[suite] = { score, entry: h }
    }
  }

  const suites: Record<string, CompositeScore> = {}
  for (const [suite, { score }] of Object.entries(latest_by_suite)) {
    suites[suite] = score
  }

  const composites = Object.values(suites)
  const avg = (key: keyof CompositeScore) => {
    const vals = composites.map(c => c[key])
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }

  const last = history[history.length - 1]
  const baseline: Baseline = {
    timestamp:   new Date().toISOString(),
    git_sha:     last.git_sha,
    bny_version: last.bny_version,
    suites,
    aggregate: {
      correctness:  Math.round(avg("correctness") * 10) / 10,
      test_quality: Math.round(avg("test_quality") * 10) / 10,
      code_quality: Math.round(avg("code_quality") * 10) / 10,
      spec_fidelity: Math.round(avg("spec_fidelity") * 10) / 10,
      defect_count: Math.round(avg("defect_count")),
      overall:      Math.round(avg("overall") * 100) / 100,
    },
  }

  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n")
  console.log(`\n  baseline saved to qa/baseline.json`)
  console.log(`  sha: ${baseline.git_sha}  suites: ${Object.keys(suites).join(", ")}`)
  console.log(`  overall: ${baseline.aggregate.overall.toFixed(2)}  defects: ${baseline.aggregate.defect_count}\n`)
}

function print_summary(): void {
  const history = load_history()
  if (history.length === 0) {
    process.stderr.write("no runs yet.\n")
    return
  }

  // latest score for each suite
  const latest: Record<string, { score: CompositeScore, sha: string, ts: string }> = {}
  for (const h of history) {
    for (const [suite, score] of Object.entries(h.suites)) {
      latest[suite] = { score, sha: h.git_sha, ts: h.timestamp }
    }
  }

  const baseline = load_baseline()

  console.log("\n  bny QA summary — latest scores per suite\n")
  console.log(`  ${pad("suite", 13)} ${pad("corr", 6)} ${pad("test", 6)} ${pad("code", 6)} ${pad("spec", 6)} ${pad("defs", 5)} ${pad("overall", 8)} ${baseline ? "vs baseline" : ""}`)
  console.log("  " + "-".repeat(baseline ? 75 : 58))

  const suite_names = ["semver", "kv-store", "json-patch"]
  for (const name of suite_names) {
    const entry = latest[name]
    if (!entry) {
      console.log(`  ${pad(name, 13)} ${"—".padEnd(40)}`)
      continue
    }
    const s = entry.score
    let delta_str = ""
    if (baseline?.suites[name]) {
      const bd = s.overall - baseline.suites[name].overall
      const dir = Math.abs(bd) < 0.005 ? "same" : bd > 0 ? "better" : "worse"
      const sign = bd >= 0 ? "+" : ""
      delta_str = `${sign}${bd.toFixed(2)} (${dir})`
    }
    console.log(`  ${pad(name, 13)} ${pad(s.correctness.toFixed(1), 6)} ${pad(s.test_quality.toFixed(1), 6)} ${pad(s.code_quality.toFixed(1), 6)} ${pad(s.spec_fidelity.toFixed(1), 6)} ${pad(String(s.defect_count), 5)} ${pad(s.overall.toFixed(2), 8)} ${delta_str}`)
  }

  // aggregate
  const all_scores = Object.values(latest).map(e => e.score)
  const avg = (key: keyof CompositeScore) => {
    const vals = all_scores.map(c => c[key])
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }
  const agg_overall = avg("overall")
  const agg_defects = Math.round(avg("defect_count"))

  console.log("  " + "-".repeat(baseline ? 75 : 58))

  let agg_delta = ""
  if (baseline) {
    const bd = agg_overall - baseline.aggregate.overall
    const dir = Math.abs(bd) < 0.005 ? "same" : bd > 0 ? "better" : "worse"
    const sign = bd >= 0 ? "+" : ""
    agg_delta = `${sign}${bd.toFixed(2)} (${dir})`
  }
  console.log(`  ${pad("AGGREGATE", 13)} ${pad(avg("correctness").toFixed(1), 6)} ${pad(avg("test_quality").toFixed(1), 6)} ${pad(avg("code_quality").toFixed(1), 6)} ${pad(avg("spec_fidelity").toFixed(1), 6)} ${pad(String(agg_defects), 5)} ${pad(agg_overall.toFixed(2), 8)} ${agg_delta}`)

  if (baseline) {
    console.log(`\n  baseline: ${baseline.git_sha.slice(0, 7)} (${baseline.timestamp.slice(0, 10)})`)
  }
  console.log()
}

// -- main --

async function main(): Promise<number> {
  const args = process.argv.slice(2)

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`usage: bun qa/run.ts [--suite NAME] [--list] [--history] [--compare] [--summary] [--baseline]

bunny QA harness. builds canonical apps, evaluates with adversarial AI review.

flags:
  --suite NAME   run only this suite (semver, kv-store, json-patch)
  --list         show available suites
  --history      show KPI history
  --compare      compare last 2 runs
  --summary      latest score per suite vs baseline
  --baseline     snapshot current scores as baseline (tracked in git)
`)
    return 0
  }

  if (args.includes("--list")) {
    console.log("\navailable suites:\n")
    for (const s of SUITES) {
      console.log(`  ${s.name.padEnd(12)} [${s.category}] ${s.prompt}`)
    }
    console.log()
    return 0
  }

  if (args.includes("--history")) {
    print_history()
    return 0
  }

  if (args.includes("--compare")) {
    print_compare()
    return 0
  }

  if (args.includes("--summary")) {
    print_summary()
    return 0
  }

  if (args.includes("--baseline")) {
    save_baseline()
    return 0
  }

  // which suites to run
  const suite_idx = args.indexOf("--suite")
  let target_suites = SUITES
  if (suite_idx !== -1 && args[suite_idx + 1]) {
    const name = args[suite_idx + 1]
    target_suites = SUITES.filter(s => s.name === name)
    if (target_suites.length === 0) {
      process.stderr.write(`unknown suite: ${name}\n`)
      return 1
    }
  }

  const { version: bny_version, git_sha } = get_bny_version()
  const timestamp = new Date().toISOString()

  console.log("\n  bny QA run")
  console.log(`  version: ${bny_version}  sha: ${git_sha}`)
  console.log(`  suites: ${target_suites.map(s => s.name).join(", ")}\n`)

  const results: RunResult[] = []

  for (const suite of target_suites) {
    console.log(`  === ${suite.name} (${suite.category}) ===\n`)

    // build
    process.stderr.write(`  building: "${suite.prompt}"\n`)
    const build = build_suite(suite)
    process.stderr.write(`  exit: ${build.exit_code}  duration: ${(build.duration_ms / 1000).toFixed(1)}s  tests: ${build.test_count}  source: ${build.source_lines} lines\n`)

    if (build.source_content.length === 0 && build.test_content.length === 0) {
      process.stderr.write(`  FAIL: pipeline produced no artifacts\n\n`)
      results.push({
        suite: suite.name,
        build,
        evaluations: [],
        composite: { correctness: 0, test_quality: 0, code_quality: 0, spec_fidelity: 0, defect_count: 0, overall: 0 },
        timestamp,
        bny_version,
        git_sha,
      })
      continue
    }

    if (build.exit_code !== 0) {
      process.stderr.write(`  pipeline failed (exit ${build.exit_code}) but produced artifacts — evaluating what exists\n`)
    }

    // evaluate — both reviewers, adversarial
    process.stderr.write(`  evaluating...\n`)
    const claude_eval = evaluate(build, suite, "claude")
    const gemini_eval = evaluate(build, suite, "gemini")
    const composite = compute_composite([claude_eval, gemini_eval])

    // print scores
    console.log(`\n  ${pad("", 10)}  corr  test  code  spec  defs`)
    for (const ev of [claude_eval, gemini_eval]) {
      const s = ev.scores
      console.log(`  ${pad(ev.reviewer, 10)}  ${pad(String(s.correctness), 4)}  ${pad(String(s.test_quality), 4)}  ${pad(String(s.code_quality), 4)}  ${pad(String(s.spec_fidelity), 4)}  ${s.defect_count}`)
    }
    console.log(`  ${pad("composite", 10)}  ${pad(composite.correctness.toFixed(1), 4)}  ${pad(composite.test_quality.toFixed(1), 4)}  ${pad(composite.code_quality.toFixed(1), 4)}  ${pad(composite.spec_fidelity.toFixed(1), 4)}  ${composite.defect_count}   overall: ${composite.overall.toFixed(2)}`)

    // print defects
    const all_defects = [...claude_eval.defects, ...gemini_eval.defects]
    if (all_defects.length > 0) {
      console.log("\n  defects found:")
      for (const d of all_defects) console.log(`    - ${d}`)
    }

    const all_missing = [...claude_eval.missing_tests, ...gemini_eval.missing_tests]
    if (all_missing.length > 0) {
      console.log("\n  missing test coverage:")
      for (const m of all_missing) console.log(`    - ${m}`)
    }

    console.log()

    results.push({
      suite: suite.name,
      build,
      evaluations: [claude_eval, gemini_eval],
      composite,
      timestamp,
      bny_version,
      git_sha,
    })
  }

  // save + print aggregate
  const path = save_run(results)
  process.stderr.write(`  saved: ${path}\n`)

  const composites = results.map(r => r.composite)
  const avg_overall = composites.reduce((a, c) => a + c.overall, 0) / composites.length
  const total_defects = composites.reduce((a, c) => a + c.defect_count, 0)

  console.log(`\n  aggregate: overall ${avg_overall.toFixed(2)}  defects ${total_defects}\n`)

  // show delta from last run
  const history = load_history()
  if (history.length >= 2) {
    const prev = history[history.length - 2]
    const delta = avg_overall - prev.aggregate.overall
    const dir = delta > 0 ? "better" : delta < 0 ? "worse" : "same"
    const sign = delta >= 0 ? "+" : ""
    console.log(`  vs last run: ${sign}${delta.toFixed(2)} (${dir})\n`)
  }

  return 0
}

process.exit(await main())
