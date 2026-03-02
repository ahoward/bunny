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
import * as assassin from "../bny/lib/assassin.ts"
import { ralph } from "../bny/lib/ralph.ts"

// -- static imports --

import { main as specify_main } from "../bny/specify.ts"
import { main as plan_main } from "../bny/plan.ts"
import { main as tasks_main } from "../bny/tasks.ts"
import { main as implement_main } from "../bny/implement.ts"
import { main as review_main } from "../bny/review.ts"
import { main as ruminate_main } from "../bny/ruminate.ts"
import { main as status_main } from "../bny/status.ts"
import { main as ps_main } from "../bny/ps.ts"
import { main as map_main } from "../bny/map.ts"
import { main as next_main } from "../bny/next.ts"
import { main as spin_main } from "../bny/spin.ts"
import { main as todo_main } from "../bny/todo.ts"
import { main as close_issue_main } from "../bny/close-issue.ts"
import { main as ipm_main } from "../bny/ipm.ts"
import { main as ai_init_main } from "../bny/ai/init.ts"
import { main as brane_eat_main } from "../bny/brane/eat.ts"
import { main as brane_ask_main } from "../bny/brane/ask.ts"
import { main as brane_digest_main } from "../bny/brane/digest.ts"
import { main as brane_pov_main } from "../bny/brane/pov.ts"
import { main as brane_storm_main } from "../bny/brane/storm.ts"
import { main as brane_enhance_main } from "../bny/brane/enhance.ts"
import { main as brane_tldr_main } from "../bny/brane/tldr.ts"
import { main as dev_pre_flight_main } from "../bny/dev/pre-flight.ts"
import { main as dev_post_flight_main } from "../bny/dev/post-flight.ts"
import { main as dev_test_main } from "../bny/dev/test.ts"
import { main as dev_health_main } from "../bny/dev/health.ts"
import { main as dev_setup_main } from "../bny/dev/setup.ts"
import { main as init_main } from "../bny/init.ts"

// -- command registry --

type CommandFn = (argv: string[]) => Promise<number>

const COMMANDS: Record<string, CommandFn> = {
  "specify":        specify_main,
  "plan":           plan_main,
  "tasks":          tasks_main,
  "implement":      implement_main,
  "review":         review_main,
  "ruminate":       ruminate_main,
  "status":         status_main,
  "ps":             ps_main,
  "map":            map_main,
  "next":           next_main,
  "spin":           spin_main,
  "todo":           todo_main,
  "close-issue":    close_issue_main,
  "ipm":            ipm_main,
  "ai/init":        ai_init_main,
  "brane/eat":      brane_eat_main,
  "brane/ask":      brane_ask_main,
  "brane/digest":   brane_digest_main,
  "brane/pov":      brane_pov_main,
  "brane/storm":    brane_storm_main,
  "brane/enhance":  brane_enhance_main,
  "brane/tldr":     brane_tldr_main,
  "dev/pre-flight": dev_pre_flight_main,
  "dev/post-flight":dev_post_flight_main,
  "dev/test":       dev_test_main,
  "dev/health":     dev_health_main,
  "dev/setup":      dev_setup_main,
  "init":           init_main,
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
  "specify":         { desc: "create feature branch + spec",       group: "workflow" },
  "plan":            { desc: "create implementation plan",         group: "workflow" },
  "tasks":           { desc: "generate task list",                 group: "workflow" },
  "implement":       { desc: "drive AI implementation loop",       group: "workflow" },
  "review":          { desc: "antagonist review (gemini)",         group: "workflow" },
  "ruminate":        { desc: "reflect on build, feed brane",       group: "workflow" },
  "brane/eat":       { desc: "ingest file/dir/URL into brane",    group: "knowledge" },
  "brane/ask":       { desc: "query the brane (read-only)",       group: "knowledge" },
  "brane/storm":     { desc: "divergent brainstorming",            group: "knowledge" },
  "brane/enhance":   { desc: "convergent worldview refinement",    group: "knowledge" },
  "brane/tldr":      { desc: "worldview outline with TL;DR synopses", group: "knowledge" },
  "brane/digest":    { desc: "rebuild worldview from all sources", group: "knowledge" },
  "brane/pov":       { desc: "manage worldview perspectives",      group: "knowledge" },
  "next":            { desc: "full pipeline for next roadmap item", group: "orchestration" },
  "spin":            { desc: "autonomous factory run (tmux)",      group: "orchestration" },
  "todo":            { desc: "manage project todos",               group: "chores" },
  "close-issue":     { desc: "close github issue",                 group: "chores" },
  "ipm":             { desc: "iteration planning meeting",         group: "chores" },
  "status":          { desc: "show current feature state",         group: "plumbing" },
  "ps":              { desc: "show running bny processes",         group: "plumbing" },
  "map":             { desc: "structural codebase map (tree-sitter)", group: "plumbing" },
  "ai/init":         { desc: "bootstrap AI tool integration",      group: "plumbing" },
  "init":            { desc: "scaffold a new project for bny",     group: "plumbing" },
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
       bny --ralph [--max-iter N] <command>
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
  --ralph             wrap command in ralph retry loop
  --max-iter N        max iterations (default: unlimited)
  --max-budget USD    max budget (default: unlimited)
  --timeout S         per-iteration timeout (default: unlimited)

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
    if (existsSync(resolve(dir, ".bny"))) return dir
    if (existsSync(resolve(dir, "bny"))) return dir
    dir = dirname(dir)
  }
  if (!quiet) {
    process.stderr.write("bny: cannot find project root (no .bny/ or bny/ directory found)\n")
    process.exitCode = 1
  }
  return process.cwd()
}

// defer root finding — init may run before .bny/ exists
let _root: string | null = null
function get_root(quiet = false): string {
  if (!_root) _root = find_root(quiet)
  return _root
}

// -- parse args --

interface ParsedArgs {
  ralph:       boolean
  max_iter:    number
  max_budget:  number
  timeout_ms:  number
  command:     string | null
  subcommand:  string | null
  rest:        string[]
}

function parse_args(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    ralph:      false,
    max_iter:   0,
    max_budget: 0,
    timeout_ms: 0,
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

    if (arg === "--max-iter" && i + 1 < argv.length) {
      result.max_iter = parseInt(argv[i + 1], 10)
      i += 2
      continue
    }

    if (arg === "--max-budget" && i + 1 < argv.length) {
      result.max_budget = parseFloat(argv[i + 1])
      i += 2
      continue
    }

    if (arg === "--timeout" && i + 1 < argv.length) {
      result.timeout_ms = parseInt(argv[i + 1], 10) * 1000
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

      // check for nested subcommand: bny ai init, bny brane eat, bny dev test
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

  // init runs before .bny/ exists — skip root check + assassin
  if (args.command === "init") {
    process.exitCode = await init_main(args.rest)
    return
  }

  // install assassin — pidfile at .bny/bny.pid, signal handlers
  const root = get_root()
  assassin.install(resolve(root, ".bny"))

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
