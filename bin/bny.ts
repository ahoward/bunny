#!/usr/bin/env bun
//
// bny - the bunny dark factory CLI (unified entry point)
//
// compiled: bun build --compile bin/bny.ts --outfile bny
//
// all subcommands are statically imported for single-binary compilation.
// in-process dispatch: no subprocess spawn for bny subcommands.
//
// "why are you wearing that stupid man suit?"
//

import { existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import * as assassin from "../src/lib/assassin.ts"
import { ralph } from "../src/lib/ralph.ts"

// -- static imports --

import { main as specify_main } from "../src/specify.ts"
import { main as plan_main } from "../src/plan.ts"
import { main as tasks_main } from "../src/tasks.ts"
import { main as implement_main } from "../src/implement.ts"
import { main as review_main } from "../src/review.ts"
import { main as challenge_main } from "../src/challenge.ts"
import { main as testgen_main } from "../src/test-gen.ts"
import { main as verify_main } from "../src/verify.ts"
import { main as ruminate_main } from "../src/ruminate.ts"
import { main as status_main } from "../src/status.ts"
import { main as ps_main } from "../src/ps.ts"
import { main as map_main } from "../src/map.ts"
import { main as next_main } from "../src/next.ts"
import { main as todo_main } from "../src/todo.ts"
import { main as close_issue_main } from "../src/close-issue.ts"
import { main as ipm_main } from "../src/ipm.ts"
import { main as uninit_main } from "../src/uninit.ts"
import { main as brane_digest_main } from "../src/brane/digest.ts"
import { main as brane_ask_main } from "../src/brane/ask.ts"
import { main as brane_rebuild_main } from "../src/brane/rebuild.ts"
import { main as brane_lens_main } from "../src/brane/lens.ts"
import { main as digest_main } from "../src/digest.ts"
import { main as brane_storm_main } from "../src/brane/storm.ts"
import { main as brane_enhance_main } from "../src/brane/enhance.ts"
import { main as brane_tldr_main } from "../src/brane/tldr.ts"
import { main as brane_loop_main } from "../src/brane/loop.ts"
import { main as dev_pre_flight_main } from "../src/dev/pre-flight.ts"
import { main as dev_post_flight_main } from "../src/dev/post-flight.ts"
import { main as dev_test_main } from "../src/dev/test.ts"
import { main as dev_health_main } from "../src/dev/health.ts"
import { main as dev_setup_main } from "../src/dev/setup.ts"
import { main as proposal_main } from "../src/proposal.ts"
import { main as build_main } from "../src/build.ts"
import { main as spike_main } from "../src/spike.ts"
import { main as init_main } from "../src/init.ts"
import { main as state_main } from "../src/state.ts"

// -- command registry --

type CommandFn = (argv: string[]) => Promise<number>

const COMMANDS: Record<string, CommandFn> = {
  "specify":        specify_main,
  "plan":           plan_main,
  "tasks":          tasks_main,
  "implement":      implement_main,
  "review":         review_main,
  "challenge":      challenge_main,
  "test-gen":       testgen_main,
  "verify":         verify_main,
  "ruminate":       ruminate_main,
  "status":         status_main,
  "ps":             ps_main,
  "map":            map_main,
  "next":           next_main,
  "todo":           todo_main,
  "close-issue":    close_issue_main,
  "ipm":            ipm_main,
  "proposal":       proposal_main,
  "build":          build_main,
  "spike":          spike_main,
  "uninit":         uninit_main,
  "digest":         digest_main,
  "brane/digest":   brane_digest_main,
  "brane/eat":      brane_digest_main, // backward compat alias
  "brane/ask":      brane_ask_main,
  "brane/rebuild":  brane_rebuild_main,
  "brane/lens":     brane_lens_main,
  "brane/storm":    brane_storm_main,
  "brane/enhance":  brane_enhance_main,
  "brane/tldr":     brane_tldr_main,
  "brane/loop":     brane_loop_main,
  "dev/pre-flight": dev_pre_flight_main,
  "dev/post-flight":dev_post_flight_main,
  "dev/test":       dev_test_main,
  "dev/health":     dev_health_main,
  "dev/setup":      dev_setup_main,
  "init":           init_main,
  "state":          state_main,
}

// -- command metadata --

interface CommandInfo {
  desc:  string
  group: string
}

const COMMAND_META: Record<string, CommandInfo> = {
  "dev/pre-flight":  { desc: "run pre-flight checks",              group: "development" },
  "dev/post-flight": { desc: "run post-flight checks",             group: "development" },
  "dev/test":        { desc: "run tests",                          group: "development" },
  "dev/health":      { desc: "check system health",                group: "development" },
  "dev/setup":       { desc: "install deps, configure hooks",      group: "development" },
  "specify":         { desc: "create feature spec",                 group: "workflow" },
  "plan":            { desc: "create implementation plan",         group: "workflow" },
  "tasks":           { desc: "generate task list",                 group: "workflow" },
  "implement":       { desc: "drive AI implementation loop",       group: "workflow" },
  "review":          { desc: "antagonist review (gemini)",         group: "workflow" },
  "challenge":       { desc: "adversary hardens the spec (gemini)", group: "workflow" },
  "test-gen":        { desc: "generate test suite from spec (gemini)", group: "workflow" },
  "verify":          { desc: "post-implementation adversary review (gemini)", group: "workflow" },
  "ruminate":        { desc: "reflect on build, feed brane",       group: "workflow" },
  "digest":          { desc: "ingest file/dir/URL into brane",    group: "knowledge" },
  "brane/ask":       { desc: "query the brane (read-only)",       group: "knowledge" },
  "brane/storm":     { desc: "divergent brainstorming",            group: "knowledge" },
  "brane/enhance":   { desc: "convergent worldview refinement",    group: "knowledge" },
  "brane/tldr":      { desc: "worldview outline with TL;DR synopses", group: "knowledge" },
  "brane/rebuild":   { desc: "rebuild worldview from all sources", group: "knowledge" },
  "brane/lens":      { desc: "manage worldview lenses",            group: "knowledge" },
  "brane/loop":      { desc: "autonomous goal-directed thought loop", group: "knowledge" },
  "next":            { desc: "full pipeline for next roadmap item", group: "orchestration" },
  "todo":            { desc: "manage project todos",               group: "chores" },
  "close-issue":     { desc: "close github issue",                 group: "chores" },
  "ipm":             { desc: "iteration planning meeting",         group: "chores" },
  "proposal":        { desc: "generate proposals from brane, accept into roadmap", group: "workflow" },
  "build":           { desc: "the dark factory (full pipeline or per-step)", group: "orchestration" },
  "spike":           { desc: "exploratory build, guardrails off",           group: "orchestration" },
  "status":          { desc: "show current feature state",         group: "plumbing" },
  "ps":              { desc: "show running bny processes",         group: "plumbing" },
  "map":             { desc: "structural codebase map + index (tree-sitter)", group: "plumbing" },
  "init":            { desc: "scaffold a project for bny (guest mode)", group: "plumbing" },
  "uninit":          { desc: "cleanly remove all bny traces",          group: "plumbing" },
  "state":           { desc: "show current build pipeline state",      group: "plumbing" },
}

const GROUP_ORDER = ["development", "workflow", "knowledge", "orchestration", "chores", "plumbing"]

const NAMESPACES = new Set(
  Object.keys(COMMANDS)
    .map(k => k.split("/")[0])
    .filter(prefix => Object.keys(COMMANDS).some(key => key.startsWith(prefix + "/") && key !== prefix))
)

// -- help --

function display_name(key: string): string {
  return key.replace("/", " ")
}

function show_help(topic: string | null, json: boolean): void {
  if (json) {
    show_help_json(topic)
    return
  }

  if (topic) {
    // namespace help
    const entries = Object.entries(COMMAND_META).filter(([k]) => k.startsWith(topic + "/"))
    if (entries.length === 0) {
      process.stderr.write(`bny: no commands in '${topic}'\n`)
      process.exitCode = 1
      return
    }
    process.stdout.write(`bny ${topic} commands:\n\n`)
    for (const [key, meta] of entries) {
      const name = display_name(key).padEnd(20)
      process.stdout.write(`  ${name}${meta.desc}\n`)
    }
    process.stdout.write(`\nrun 'bny ${topic} <cmd> --help' for details\n`)
    return
  }

  // full help
  process.stdout.write(`bny — the bunny dark factory CLI

usage: bny <command> [args...]
       bny --effort <level> <command>
       bny --model <model> <command>
`)

  for (const group of GROUP_ORDER) {
    const entries = Object.entries(COMMAND_META).filter(([, m]) => m.group === group)
    if (entries.length === 0) continue
    process.stdout.write(`\n${group}:\n`)
    for (const [key, meta] of entries) {
      const name = display_name(key).padEnd(20)
      process.stdout.write(`  ${name}${meta.desc}\n`)
    }
  }

  process.stdout.write(`
options:
  --verbose           stream LLM subprocess output to stderr
  --model MODEL       model to use for LLM calls (or set BNY_MODEL env var)
  --effort LEVEL      retry with canned limits (little, some, full, max)
  --ralph             wrap command in ralph retry loop
  --max-iter N        max iterations (implies --ralph)
  --max-budget USD    max budget in dollars (implies --ralph)
  --timeout S         per-iteration timeout in seconds (implies --ralph)

effort presets:
  little              2 iters, $0.50, 2min timeout
  some                5 iters, $2, 5min timeout
  full                10 iters, $5, 10min timeout
  max                 unlimited

run 'bny help <topic>' or 'bny <command> --help'
`)
}

function show_help_json(topic: string | null): void {
  const entries = Object.entries(COMMAND_META)
    .filter(([k]) => topic ? k.startsWith(topic + "/") : true)
    .map(([key, meta]) => ({
      name:      display_name(key),
      key,
      desc:      meta.desc,
      group:     meta.group,
      namespace: key.includes("/") ? key.split("/")[0] : null,
    }))

  const out = {
    commands:   entries,
    namespaces: [...NAMESPACES].sort(),
  }

  process.stdout.write(JSON.stringify(out, null, 2) + "\n")
}

// -- find project root --

function find_root(quiet = false): string {
  let dir = process.cwd()
  while (dir !== "/") {
    if (existsSync(resolve(dir, "bny"))) return dir
    dir = dirname(dir)
  }
  if (!quiet) {
    process.stderr.write("bny: cannot find project root (no bny/ directory found)\n")
    process.exitCode = 1
  }
  return process.cwd()
}

// defer root finding — init may run before bny/ exists
let _root: string | null = null
function get_root(quiet = false): string {
  if (!_root) _root = find_root(quiet)
  return _root
}

// -- parse args --

// -- effort presets --

interface EffortPreset {
  max_iter:   number
  max_budget: number
  timeout_ms: number
}

const EFFORT_PRESETS: Record<string, EffortPreset> = {
  little: { max_iter: 2,  max_budget: 0.50, timeout_ms: 120_000 },
  some:   { max_iter: 5,  max_budget: 2.00, timeout_ms: 300_000 },
  full:   { max_iter: 10, max_budget: 5.00, timeout_ms: 600_000 },
  max:    { max_iter: 0,  max_budget: 0,    timeout_ms: 0 },
}

interface ParsedArgs {
  ralph:       boolean
  verbose:     boolean
  max_iter:    number
  max_budget:  number
  timeout_ms:  number
  model:       string | null
  command:     string | null
  subcommand:  string | null
  rest:        string[]
}

function parse_args(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    ralph:      false,
    verbose:    false,
    max_iter:   0,
    max_budget: 0,
    timeout_ms: 0,
    model:      null,
    command:    null,
    subcommand: null,
    rest:       [],
  }

  let i = 0

  while (i < argv.length) {
    const arg = argv[i]

    if (arg === "--ralph") {
      result.ralph = true
      i++
      continue
    }

    if (arg === "--verbose") {
      result.verbose = true
      i++
      continue
    }

    if (arg === "--max-iter" && i + 1 < argv.length) {
      const val = parseInt(argv[i + 1], 10)
      if (isNaN(val) || val < 0) {
        process.stderr.write(`bny: invalid --max-iter value '${argv[i + 1]}'\n`)
        process.exitCode = 1
        return result
      }
      result.max_iter = val
      i += 2
      continue
    }

    if (arg === "--max-budget" && i + 1 < argv.length) {
      const val = parseFloat(argv[i + 1])
      if (isNaN(val) || val < 0) {
        process.stderr.write(`bny: invalid --max-budget value '${argv[i + 1]}'\n`)
        process.exitCode = 1
        return result
      }
      result.max_budget = val
      i += 2
      continue
    }

    if (arg === "--timeout" && i + 1 < argv.length) {
      const val = parseInt(argv[i + 1], 10)
      if (isNaN(val) || val < 0) {
        process.stderr.write(`bny: invalid --timeout value '${argv[i + 1]}'\n`)
        process.exitCode = 1
        return result
      }
      result.timeout_ms = val * 1000
      i += 2
      continue
    }

    if (arg === "--effort" && i + 1 < argv.length) {
      const preset = EFFORT_PRESETS[argv[i + 1]]
      if (preset) {
        result.ralph = true
        result.max_iter = preset.max_iter
        result.max_budget = preset.max_budget
        result.timeout_ms = preset.timeout_ms
      } else {
        process.stderr.write(`bny: unknown effort level '${argv[i + 1]}' (use: little, some, full, max)\n`)
        process.exitCode = 1
        return result
      }
      i += 2
      continue
    }

    if (arg === "--model" && i + 1 < argv.length) {
      const val = argv[i + 1]
      if (!/^[a-zA-Z0-9._-]+$/.test(val)) {
        process.stderr.write(`bny: invalid --model value '${val}' (alphanumeric, hyphens, dots only)\n`)
        process.exitCode = 1
        return result
      }
      result.model = val
      i += 2
      continue
    }

    if (arg.startsWith("-")) {
      result.rest.push(arg)
      i++
      continue
    }

    // first positional = command
    if (result.command === null) {
      result.command = arg
      i++

      // check for nested subcommand: bny ai init, bny brane digest, bny dev test
      if (i < argv.length && !argv[i].startsWith("-")) {
        const key = `${result.command}/${argv[i]}`
        if (COMMANDS[key]) {
          result.subcommand = argv[i]
          i++
        }
      }
      continue
    }

    result.rest.push(arg)
    i++
  }

  // implicitly enable ralph when any limit flag is set
  if (!result.ralph && (result.max_iter > 0 || result.max_budget > 0 || result.timeout_ms > 0)) {
    result.ralph = true
  }

  return result
}

// -- resolve command --

function resolve_command(cmd: string, subcmd: string | null): string | null {
  if (subcmd) {
    const key = `${cmd}/${subcmd}`
    if (COMMANDS[key]) return key
  }
  if (COMMANDS[cmd]) return cmd
  return null
}

// -- main --

async function main(): Promise<void> {
  // bun keeps same argv layout in both dev and compiled mode:
  // argv = ["bun", script_or_bunfs_path, ...args]
  const args = parse_args(process.argv.slice(2))

  // abort if parse_args set an error
  if (process.exitCode && process.exitCode !== 0) return

  const json_flag = args.rest.includes("--json")

  // bny / bny --help / bny -h → show help
  if (!args.command) {
    const explicit = args.rest.includes("--help") || args.rest.includes("-h")
    show_help(null, json_flag)
    process.exitCode = explicit ? 0 : 1
    return
  }

  // bny help [topic] [--json]
  if (args.command === "help") {
    const topic = args.subcommand || args.rest.find(a => !a.startsWith("-")) || null
    show_help(topic, json_flag)
    return
  }

  // bny brane help / bny brane (bare namespace) → namespace help
  if (NAMESPACES.has(args.command) && !args.subcommand && !COMMANDS[args.command]) {
    const first_rest = args.rest.find(a => !a.startsWith("-"))
    // bny brane help → rest=["help"]
    // bny brane      → rest=[]
    if (!first_rest || first_rest === "help") {
      show_help(args.command, json_flag)
      return
    }
  }

  // init/uninit run before bny/ exists or after it's removed — skip root check + assassin
  if (args.command === "init") {
    process.exitCode = await init_main(args.rest)
    return
  }

  if (args.command === "uninit") {
    process.exitCode = await uninit_main(args.rest)
    return
  }

  // model version pinning: --model flag sets env for all subcommands
  if (args.model) {
    process.env.BNY_MODEL = args.model
  }

  // verbose: stream LLM subprocess stderr to terminal
  if (args.verbose) {
    process.env.BNY_VERBOSE = "1"
  }

  // install assassin — pidfile at bny/bny.pid, signal handlers
  const root = get_root()
  assassin.install(resolve(root, "bny"))

  const cmd_key = resolve_command(args.command, args.subcommand)

  if (!cmd_key) {
    const full_cmd = args.subcommand ? `${args.command} ${args.subcommand}` : args.command
    process.stderr.write(`bny: unknown command '${full_cmd}'\n`)
    show_help(null, false)
    process.exitCode = 1
    return
  }

  const command_fn = COMMANDS[cmd_key]

  // ralph mode: wrap in retry loop
  if (args.ralph) {
    const result = await ralph({
      fn:         () => command_fn(args.rest),
      max_iter:   args.max_iter,
      max_budget: args.max_budget,
      timeout_ms: args.timeout_ms,
      session_id: null,
    })

    process.stderr.write(JSON.stringify({
      type:       "ralph_complete",
      ...result,
      timestamp:  new Date().toISOString(),
    }) + "\n")

    process.exitCode = result.status === "complete" ? 0 : 1
    return
  }

  // normal mode: call the command function in-process
  process.exitCode = await command_fn(args.rest)
}

main()
