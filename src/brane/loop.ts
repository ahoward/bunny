#!/usr/bin/env bun
//
// bny brane loop — autonomous goal-directed thought loop
//
// iteratively: reflect on worldview, search the web, fetch sources,
// incorporate knowledge, and journal each round. persistent state
// enables resume. each round builds on the last.
//
// usage:
//   bny brane loop "distributed systems"        # start new loop
//   bny brane loop --rounds 5 "auth patterns"   # 5 rounds
//   bny brane loop --yes "topic"                # auto-incorporate
//   bny brane loop --dry-run "topic"            # print reflect prompt
//   bny brane loop --json "topic"               # JSON output
//   bny brane loop --resume politics            # resume existing loop
//   bny brane loop list                         # show all loops
//

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "../lib/result.ts"
import { find_root } from "../lib/feature.ts"
import {
  ensure_brane, load_source, load_worldview, load_active_lenses,
  call_claude, call_claude_with_tools, parse_json, apply_operations,
  stash_source, preview_operations, print_intake_diff, confirm_intake,
  regenerate_index,
} from "../lib/brane.ts"
import type { EatResponse } from "../lib/brane.ts"
import { create_spinner } from "../lib/spinner.ts"
import { which_check } from "../lib/spawn.ts"
import { main as proposal_main } from "../proposal.ts"

// -- types --

interface LoopState {
  slug:              string
  goal:              string
  created_at:        string
  rounds_completed:  number
  status:            "active" | "converged" | "stopped"
  search_history:    string[]
}

interface ReflectResponse {
  gaps:        string[]
  queries:     string[]
  urls:        string[]
  assessment:  string
  converging:  boolean
  reasoning:   string
}

interface SearchResponse {
  results: { url: string, title: string, snippet: string }[]
}

interface RoundJournal {
  round:       number
  searched:    string[]
  fetched:     string[]
  eaten:       number
  operations:  number
  assessment:  string
  converging:  boolean
}

// -- helpers --

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

function loops_dir(root: string): string {
  return resolve(root, "bny/loops")
}

function loop_dir(root: string, slug: string): string {
  return resolve(root, "bny/loops", slug)
}

function rounds_dir(root: string, slug: string): string {
  return resolve(root, "bny/loops", slug, "rounds")
}

function meta() {
  return { path: "/bny/brane/loop", timestamp: new Date().toISOString(), duration_ms: 0 }
}

// -- state persistence --

function load_loop_state(root: string, slug: string): LoopState | null {
  const path = resolve(loop_dir(root, slug), "state.json")
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as LoopState
  } catch {
    return null
  }
}

function save_loop_state(root: string, state: LoopState): void {
  const dir = loop_dir(root, state.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, "state.json"), JSON.stringify(state, null, 2) + "\n")
}

function load_round_journals(root: string, slug: string): string {
  const dir = rounds_dir(root, slug)
  if (!existsSync(dir)) return ""
  const files = readdirSync(dir).filter(f => f.endsWith(".md")).sort()
  if (files.length === 0) return ""
  return files.map(f => readFileSync(resolve(dir, f), "utf-8")).join("\n\n---\n\n")
}

function write_round_journal(root: string, slug: string, journal: RoundJournal): void {
  const dir = rounds_dir(root, slug)
  mkdirSync(dir, { recursive: true })
  const pad = String(journal.round).padStart(3, "0")
  const date = new Date().toISOString()

  const content = `# Round ${journal.round}
${journal.assessment}

Date: ${date}
Converging: ${journal.converging}

## Searched
${journal.searched.length > 0 ? journal.searched.map(q => `- ${q}`).join("\n") : "(none)"}

## Fetched
${journal.fetched.length > 0 ? journal.fetched.map(u => `- ${u}`).join("\n") : "(none)"}

## Results
- Sources eaten: ${journal.eaten}
- Worldview operations: ${journal.operations}
`

  writeFileSync(resolve(dir, `${pad}.md`), content)
}

function list_all_loops(root: string): LoopState[] {
  const dir = loops_dir(root)
  if (!existsSync(dir)) return []
  const states: LoopState[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const state = load_loop_state(root, entry.name)
    if (state) states.push(state)
  }
  return states.sort((a, b) => a.created_at.localeCompare(b.created_at))
}

function empty_journal(round: number): RoundJournal {
  return { round, searched: [], fetched: [], eaten: 0, operations: 0, assessment: "(round failed)", converging: false }
}

// -- subcommand: list --

async function cmd_list(argv: string[]): Promise<number> {
  let json_mode = false
  for (const arg of argv) {
    if (arg === "--json") json_mode = true
    if (arg === "--help" || arg === "-h") {
      process.stdout.write("usage: bny brane loop list [--json]\n\nshows all loops with status.\n")
      return 0
    }
  }

  const root = find_root()
  const loops = list_all_loops(root)

  if (loops.length === 0) {
    if (json_mode) {
      process.stdout.write("[]\n")
    } else {
      process.stderr.write("no loops found\n")
    }
    return 0
  }

  if (json_mode) {
    process.stdout.write(JSON.stringify(loops, null, 2) + "\n")
    return 0
  }

  process.stdout.write("\n")
  for (const loop of loops) {
    const date = loop.created_at.split("T")[0]
    process.stdout.write(`  ${loop.slug.padEnd(30)} ${String(loop.rounds_completed).padStart(3)} rounds  ${loop.status.padEnd(10)} ${date}\n`)
  }
  process.stdout.write(`\n${loops.length} loop(s)\n`)
  return 0
}

// -- core: run one round --

async function run_round(
  root: string,
  state: LoopState,
  round_num: number,
  auto_yes: boolean,
): Promise<{ journal: RoundJournal, should_stop: boolean }> {

  // 1. reload brane state (picks up previous round changes)
  const lenses = load_active_lenses(root)
  const worldview = load_worldview(root)
  const history = load_round_journals(root, state.slug)

  const lens_block = lenses.length > 0
    ? lenses.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
    : "(no active lenses)"

  const worldview_block = worldview.length > 0
    ? worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
    : "(empty worldview)"

  const history_block = history.length > 0 ? history : "(first round)"

  const already_fetched = state.search_history.length > 0
    ? state.search_history.map(u => `- ${u}`).join("\n")
    : "(none)"

  // 2. REFLECT — identify gaps, generate search queries
  const reflect_prompt = `# Active Lenses

${lens_block}

---

# Current Worldview

${worldview_block}

---

# Loop Goal

${state.goal}

---

# Previous Rounds

${history_block}

---

# Already Fetched URLs

${already_fetched}

---

# Instructions

You are an autonomous research agent running a knowledge accumulation loop.
Your goal is: "${state.goal}"

Analyze the current worldview against the goal. Identify:
1. What gaps exist — what important aspects of the goal are not yet covered?
2. What search queries would fill those gaps (2-5 queries)
3. What specific URLs to fetch directly, if you know them (0-5 URLs)
4. Whether the worldview is converging (gap-free enough to stop)

Do NOT suggest URLs that are already in the "Already Fetched URLs" list.

Respond with ONLY valid JSON (no markdown fences):
{
  "gaps": ["gap description 1", "gap description 2"],
  "queries": ["search query 1", "search query 2"],
  "urls": ["https://specific-url.com/page"],
  "assessment": "brief assessment of current state vs goal",
  "converging": false,
  "reasoning": "why these queries and urls were chosen"
}

Set converging to true ONLY if the worldview comprehensively covers the goal
and additional research would yield diminishing returns.
`

  const spin_reflect = create_spinner(`round ${round_num}: reflecting`)
  const reflect_raw = call_claude(reflect_prompt, root)
  if (!reflect_raw) {
    spin_reflect.stop()
    return { journal: empty_journal(round_num), should_stop: true }
  }

  let reflect = parse_json<ReflectResponse>(reflect_raw)
  if (!reflect) {
    spin_reflect.stop()
    process.stderr.write("warning: failed to parse reflect response, retrying...\n")
    const spin_retry = create_spinner(`round ${round_num}: retrying reflect`)
    const retry = call_claude(reflect_prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences.", root)
    spin_retry.stop()
    if (!retry) return { journal: empty_journal(round_num), should_stop: true }
    reflect = parse_json<ReflectResponse>(retry)
    if (!reflect) return { journal: empty_journal(round_num), should_stop: true }
  } else {
    spin_reflect.stop(`round ${round_num}: reflected`)
  }

  // normalize
  if (!reflect.gaps) reflect.gaps = []
  if (!reflect.queries) reflect.queries = []
  if (!reflect.urls) reflect.urls = []

  process.stderr.write(`  gaps: ${reflect.gaps.length}, queries: ${reflect.queries.length}, urls: ${reflect.urls.length}\n`)
  process.stderr.write(`  assessment: ${reflect.assessment}\n`)

  // 3. check convergence
  if (reflect.converging) {
    process.stderr.write(`  converging — loop believes goal is sufficiently covered\n`)
    const journal: RoundJournal = {
      round: round_num, searched: [], fetched: [], eaten: 0, operations: 0,
      assessment: reflect.assessment, converging: true,
    }
    return { journal, should_stop: true }
  }

  // 4. SEARCH — use Claude with WebSearch to execute queries
  const discovered_urls: string[] = [...reflect.urls]

  if (reflect.queries.length > 0) {
    const search_prompt = `Search the web for the following queries and return URLs that contain relevant, substantive information.

Queries:
${reflect.queries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Context: researching "${state.goal}"

For each query, find 2-3 high-quality URLs.
Return ONLY valid JSON (no markdown fences):
{
  "results": [
    {"url": "https://...", "title": "...", "snippet": "brief description"}
  ]
}

Prioritize: authoritative sources, recent content, diverse perspectives.
Skip: paywalled content, social media posts, SEO spam.
`

    const spin_search = create_spinner(`round ${round_num}: searching`)
    const search_raw = call_claude_with_tools(search_prompt, root, ["WebSearch", "WebFetch"])
    spin_search.stop()

    if (search_raw) {
      const search_resp = parse_json<SearchResponse>(search_raw)
      if (search_resp?.results) {
        for (const r of search_resp.results) {
          if (r.url && !discovered_urls.includes(r.url)) {
            discovered_urls.push(r.url)
          }
        }
        process.stderr.write(`  search returned ${search_resp.results.length} result(s)\n`)
      }
    }
  }

  // 5. FETCH — deduplicate against search_history, then fetch
  const new_urls = discovered_urls.filter(u => !state.search_history.includes(u))
  const fetched_urls: string[] = []
  const fetched_contents: { url: string, content: string }[] = []

  for (const url of new_urls.slice(0, 10)) {
    const spin_fetch = create_spinner(`round ${round_num}: fetching ${url.slice(0, 60)}`)
    const loaded = load_source(url, root)
    spin_fetch.stop()

    if (loaded) {
      stash_source(root, url, loaded.content)
      fetched_urls.push(url)
      fetched_contents.push({ url, content: loaded.content })
      state.search_history.push(url)
      process.stderr.write(`  fetched: ${url} (${loaded.content.length} bytes)\n`)
    } else {
      process.stderr.write(`  failed: ${url}\n`)
      state.search_history.push(url)
    }
  }

  // 6. EAT — incorporate fetched content into worldview
  let total_ops = 0
  let total_eaten = 0

  if (fetched_contents.length > 0) {
    const combined_content = fetched_contents
      .map(fc => `--- Source: ${fc.url} ---\n\n${fc.content.slice(0, 50000)}`)
      .join("\n\n---\n\n")

    const current_worldview = load_worldview(root)
    const current_lenses = load_active_lenses(root)

    const wv_block = current_worldview.length > 0
      ? current_worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
      : "(empty worldview)"

    const lens_blk = current_lenses.length > 0
      ? current_lenses.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
      : "(no active lenses)"

    const eat_prompt = `# Active Lenses

${lens_blk}

---

# Current Worldview

${wv_block}

---

# New Information

Research goal: ${state.goal}

${combined_content}

---

# Instructions

You are maintaining a knowledge base as markdown files.
Filter this information through all active lenses above.
Focus on information relevant to the research goal: "${state.goal}"
Not everything should be absorbed — only concepts that matter
through your active lenses. Be selective.

For each concept worth keeping:
- Decide if it belongs in an existing worldview file (update) or needs a new one (create)
- When updating, include the FULL new content for the file (not just the diff)
- Keep files focused on a single topic
- Use clear markdown with headers, not walls of text
- Organize into subdirectories by natural topic boundaries
- Every file MUST start with an H1 heading, then a one-sentence TL;DR on the next line (no blank line between heading and TL;DR).

Respond with ONLY valid JSON (no markdown fences):
{
  "operations": [
    {"action": "create", "path": "relative/path.md", "content": "full markdown content"},
    {"action": "update", "path": "existing/path.md", "content": "full replacement content"}
  ],
  "reasoning": "brief explanation of what was absorbed and what was filtered out"
}

Paths are relative to worldview/. Use lowercase-kebab-case for file and directory names.
If nothing is worth absorbing, return empty operations with reasoning explaining why.
`

    const spin_eat = create_spinner(`round ${round_num}: eating ${fetched_contents.length} source(s)`)
    const eat_raw = call_claude(eat_prompt, root)

    if (eat_raw) {
      let eat_resp = parse_json<EatResponse>(eat_raw)
      if (!eat_resp) {
        spin_eat.stop()
        process.stderr.write("warning: failed to parse eat response, retrying...\n")
        const spin_retry = create_spinner(`round ${round_num}: retrying eat`)
        const retry = call_claude(eat_prompt + "\n\nYour last response was not valid JSON. Try again. Raw JSON only, no markdown fences.", root)
        spin_retry.stop()
        if (retry) eat_resp = parse_json<EatResponse>(retry)
      } else {
        spin_eat.stop()
      }

      if (eat_resp && eat_resp.operations.length > 0) {
        const diffs = preview_operations(root, eat_resp.operations)
        print_intake_diff(diffs, eat_resp.reasoning)

        let should_apply = auto_yes
        if (!auto_yes) {
          should_apply = confirm_intake()
        }

        if (should_apply) {
          apply_operations(root, eat_resp.operations)
          total_ops = eat_resp.operations.length
          total_eaten = fetched_contents.length
          process.stderr.write(`  applied ${total_ops} operation(s)\n`)
          await regenerate_index(root)
        } else {
          process.stderr.write("  skipped incorporation\n")
        }
      } else {
        process.stderr.write("  nothing absorbed\n")
      }
    } else {
      spin_eat.stop()
    }
  } else {
    process.stderr.write("  no new content to eat\n")
  }

  // 7. JOURNAL
  const journal: RoundJournal = {
    round: round_num,
    searched: reflect.queries,
    fetched: fetched_urls,
    eaten: total_eaten,
    operations: total_ops,
    assessment: reflect.assessment,
    converging: false,
  }

  return { journal, should_stop: false }
}

// -- help --

function show_help(): void {
  process.stdout.write(`usage: bny brane loop [--dry-run] [--yes] [--json] [--rounds N] [--propose [N]] <goal>
       bny brane loop --resume <slug> [--rounds N] [--yes] [--propose]
       bny brane loop list [--json]

autonomous goal-directed thought loop. iteratively reflects on the
worldview, searches the web, fetches sources, and journals each round.

commands:
  bny brane loop "topic"          start new loop (1 round)
  bny brane loop --rounds 5 "x"  run 5 rounds
  bny brane loop --resume <slug>  resume existing loop
  bny brane loop list             show all loops

flags:
  --rounds N      number of rounds (default: 1)
  --resume SLUG   resume an existing loop
  --yes, -y       auto-incorporate into worldview (skip confirmation)
  --propose [N]   generate N proposals after loop completes (default: 1)
  --dry-run       print reflect prompt, don't execute
  --json          JSON output
`)
}

// -- main --

export async function main(argv: string[]): Promise<number> {
  // subcommand dispatch
  if (argv[0] === "list") {
    return cmd_list(argv.slice(1))
  }

  // -- parse args --

  let dry_run = false
  let auto_yes = false
  let json_mode = false
  let rounds = 1
  let resume_slug: string | null = null
  let propose_count = 0 // 0 = disabled, >0 = generate N proposals after loop
  const input_parts: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--dry-run") {
      dry_run = true
    } else if (arg === "--yes" || arg === "-y") {
      auto_yes = true
    } else if (arg === "--json") {
      json_mode = true
    } else if (arg === "--propose") {
      // --propose or --propose N
      const next = argv[i + 1]
      if (next && /^\d+$/.test(next)) {
        propose_count = parseInt(next, 10)
        i++
      } else {
        propose_count = 1
      }
    } else if (arg === "--rounds" && i + 1 < argv.length) {
      const val = parseInt(argv[i + 1], 10)
      if (isNaN(val) || val < 1) rounds = 1
      else rounds = val
      i++
    } else if (arg === "--resume" && i + 1 < argv.length) {
      resume_slug = argv[i + 1]
      i++
    } else if (arg === "--help" || arg === "-h") {
      show_help()
      return 0
    } else {
      input_parts.push(arg)
    }
  }

  const goal_input = input_parts.join(" ").trim()

  // -- setup --

  const root = find_root()
  ensure_brane(root)

  // -- check claude --

  if (!dry_run) {
    if (!which_check("claude")) {
      process.stdout.write(JSON.stringify(error({ claude: [{ code: "not_found", message: "claude CLI not found on PATH" }] }, meta()), null, 2) + "\n")
      return 1
    }
  }

  // -- resolve or create loop state --

  let state: LoopState

  if (resume_slug) {
    const loaded = load_loop_state(root, resume_slug)
    if (!loaded) {
      process.stdout.write(JSON.stringify(error({ loop: [{ code: "not_found", message: `loop not found: ${resume_slug}` }] }, meta()), null, 2) + "\n")
      return 1
    }
    state = loaded
    if (state.status === "converged") {
      process.stderr.write(`warning: loop '${state.slug}' previously converged. continuing anyway.\n`)
    }
    state.status = "active"
    process.stderr.write(`resuming loop '${state.slug}' from round ${state.rounds_completed + 1}\n`)
  } else {
    if (!goal_input) {
      process.stdout.write(JSON.stringify(error({ goal: [{ code: "required", message: "goal is required (or use --resume)" }] }, meta()), null, 2) + "\n")
      return 1
    }
    const slug = slugify(goal_input)
    if (!slug) {
      process.stdout.write(JSON.stringify(error({ goal: [{ code: "invalid", message: "could not generate slug from goal" }] }, meta()), null, 2) + "\n")
      return 1
    }

    // check for existing loop with same slug (skip check for dry-run)
    if (!dry_run) {
      const existing = load_loop_state(root, slug)
      if (existing) {
        process.stderr.write(`loop '${slug}' already exists (${existing.rounds_completed} rounds). use --resume ${slug} to continue.\n`)
        return 1
      }
    }

    state = {
      slug,
      goal: goal_input,
      created_at: new Date().toISOString(),
      rounds_completed: 0,
      status: "active",
      search_history: [],
    }

    if (!dry_run) {
      const dir = loop_dir(root, slug)
      mkdirSync(dir, { recursive: true })
      mkdirSync(rounds_dir(root, slug), { recursive: true })
      writeFileSync(resolve(dir, "goal.md"), `# ${goal_input}\n\nStarted: ${state.created_at}\n`)
      save_loop_state(root, state)
      process.stderr.write(`created loop '${slug}'\n`)
    }
  }

  // -- dry run --

  if (dry_run) {
    const dry_lenses = load_active_lenses(root)
    const worldview = load_worldview(root)
    const history = load_round_journals(root, state.slug)

    const dry_lens_block = dry_lenses.length > 0
      ? dry_lenses.map(p => `## ${p.heading}\n\n${p.content}`).join("\n\n")
      : "(no active lenses)"

    const worldview_block = worldview.length > 0
      ? worldview.map(w => `## ${w.heading}\n\n${w.content}`).join("\n\n")
      : "(empty worldview)"

    process.stdout.write(`# Reflect Prompt (round ${state.rounds_completed + 1})

# Active Lenses

${dry_lens_block}

---

# Current Worldview

${worldview_block}

---

# Loop Goal

${state.goal}

---

# Previous Rounds

${history.length > 0 ? history : "(first round)"}

---

# Already Fetched URLs

${state.search_history.length > 0 ? state.search_history.map(u => `- ${u}`).join("\n") : "(none)"}
`)
    return 0
  }

  // -- run rounds --

  let converge_streak = 0

  for (let r = 1; r <= rounds; r++) {
    const round_num = state.rounds_completed + 1

    if (rounds > 1) process.stderr.write(`\n[round ${round_num} (${r}/${rounds})]\n`)
    else process.stderr.write(`\n[round ${round_num}]\n`)

    const { journal, should_stop } = await run_round(root, state, round_num, auto_yes)

    // persist
    write_round_journal(root, state.slug, journal)
    state.rounds_completed = round_num

    if (should_stop && journal.converging) {
      converge_streak++
    } else {
      converge_streak = 0
    }

    // converged for 2 consecutive rounds => stop
    if (converge_streak >= 2) {
      state.status = "converged"
      save_loop_state(root, state)
      process.stderr.write(`\nloop converged after ${state.rounds_completed} rounds\n`)
      break
    }

    if (should_stop && journal.converging && r < rounds) {
      process.stderr.write(`  (convergence signal — continuing since more rounds requested)\n`)
    } else if (should_stop && !journal.converging) {
      state.status = "stopped"
      save_loop_state(root, state)
      process.stderr.write(`  round failed, stopping\n`)
      break
    }

    save_loop_state(root, state)
  }

  // finalize
  if (state.status === "active") {
    save_loop_state(root, state)
  }

  // -- propose (optional) --

  if (propose_count > 0) {
    process.stderr.write(`\n--- generating ${propose_count} proposal(s) from loop ---\n`)
    const propose_args = ["--count", String(propose_count), state.goal]
    const propose_exit = await proposal_main(propose_args)
    if (propose_exit !== 0) {
      process.stderr.write("warning: proposal generation failed\n")
    }
  }

  // -- output --

  const result_data = {
    slug: state.slug,
    goal: state.goal,
    rounds_completed: state.rounds_completed,
    status: state.status,
    urls_fetched: state.search_history.length,
  }

  if (json_mode) {
    process.stdout.write(JSON.stringify(success(result_data, meta()), null, 2) + "\n")
  }

  return 0
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
