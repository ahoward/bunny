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
  "dev/pre-flight": dev_pre_flight_main,
  "dev/post-flight":dev_post_flight_main,
  "dev/test":       dev_test_main,
  "dev/health":     dev_health_main,
  "dev/setup":      dev_setup_main,
  "init":           init_main,
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

// -- usage --

function usage(): void {
  process.stderr.write(`bny - the bunny dark factory CLI

usage:
  bny <command> [args...]
  bny --ralph [--max-iter N] [--max-budget USD] [--timeout S] <command> [args...]

commands:
  dev/pre-flight    run pre-flight checks
  dev/post-flight   run post-flight checks
  dev/test          run tests
  dev/health        check system health
  dev/setup         install deps, configure hooks

  specify           create feature branch + spec
  plan              create implementation plan
  tasks             generate task list
  implement         drive AI implementation loop
  review            antagonist review
  ruminate          reflect on build, feed brane

  map               structural codebase map (tree-sitter)

  brane storm       divergent brainstorming against the worldview
  brane enhance     convergent refinement of the worldview
  brane eat         ingest knowledge into the brane
  brane ask         query the brane
  brane digest      comprehensive brane integration
  brane pov         manage worldview perspectives

  next              run full pipeline for next roadmap item
  spin              launch autonomous factory run (tmux)
  todo              manage github issues
  close-issue       close a github issue
  ipm               interactive planning mode

  status            show current state
  ps                show running bny processes
  ai init           bootstrap AI tool integration
  init              scaffold a new project for bny

options:
  --ralph           wrap command in ralph retry loop
  --max-iter N      max iterations for ralph loop (default: unlimited)
  --max-budget USD  max budget for ralph loop (default: unlimited)
  --timeout S       per-iteration timeout in seconds (default: unlimited)
`)
}

// -- main --

async function main(): Promise<void> {
  // bun keeps same argv layout in both dev and compiled mode:
  // argv = ["bun", script_or_bunfs_path, ...args]
  const args = parse_args(process.argv.slice(2))

  if (!args.command) {
    usage()
    process.exitCode = 1
    return
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
    usage()
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
