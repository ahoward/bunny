#!/usr/bin/env bun
//
// bny todo — project-level task tracking
//
// lightweight todos for chores that aren't features or bugs.
// state lives in .bny/todos.md as a plain markdown checklist.
//
// usage:
//   bny todo                    # list all todos
//   bny todo add "setup dns"    # add a todo
//   bny todo done 3             # check off item #3
//   bny todo rm 3               # remove item #3
//   bny todo promote 3          # create gh issue, mark done
//

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { success, error } from "../src/lib/result.ts"
import { find_root } from "./lib/feature.ts"

// -- types --

interface Todo {
  index:    number
  text:     string
  done:     boolean
  raw:      string
}

// -- helpers --

const TODO_PATTERN = /^- \[([ x])\] (.+)$/

function todos_path(root: string): string {
  return resolve(root, ".bny/todos.md")
}

function load_todos(path: string): Todo[] {
  if (!existsSync(path)) return []
  const lines = readFileSync(path, "utf-8").split("\n")
  const todos: Todo[] = []
  let index = 1
  for (const line of lines) {
    const match = line.match(TODO_PATTERN)
    if (match) {
      todos.push({ index: index++, text: match[2], done: match[1] === "x", raw: line })
    }
  }
  return todos
}

function save_todos(path: string, todos: Todo[]): void {
  const content = todos.map(t => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n") + "\n"
  writeFileSync(path, content)
}

function meta() {
  return { path: "/bny/todo", timestamp: new Date().toISOString(), duration_ms: 0 }
}

export async function main(argv: string[]): Promise<number> {
  // -- parse args --

  const subcmd = argv[0] && !argv[0].startsWith("-") ? argv[0] : "list"
  const rest = subcmd === "list" ? argv : argv.slice(1)

  if (subcmd === "--help" || subcmd === "-h") {
    process.stdout.write(`usage: bny todo [command] [args]

commands:
  (none)          list all todos
  add <text>      add a todo
  done <n>        check off item #n
  rm <n>          remove item #n
  promote <n>     create gh issue from item #n
`)
    return 0
  }

  const root = find_root()
  const path = todos_path(root)

  // -- list --

  if (subcmd === "list") {
    const todos = load_todos(path)
    if (todos.length === 0) {
      process.stdout.write("no todos\n")
      return 0
    }

    const open = todos.filter(t => !t.done)
    const done = todos.filter(t => t.done)

    for (const t of open) {
      process.stdout.write(`  ${t.index}. [ ] ${t.text}\n`)
    }
    for (const t of done) {
      process.stdout.write(`  ${t.index}. [x] ${t.text}\n`)
    }

    process.stdout.write(`\n${open.length} open, ${done.length} done\n`)
    return 0
  }

  // -- add --

  if (subcmd === "add") {
    const text = rest.join(" ").trim()
    if (!text) {
      process.stdout.write(JSON.stringify(error({ text: [{ code: "required", message: "todo text is required" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const todos = load_todos(path)
    todos.push({ index: todos.length + 1, text, done: false, raw: `- [ ] ${text}` })
    save_todos(path, todos)

    process.stdout.write(JSON.stringify(success({ action: "add", text, index: todos.length }, meta()), null, 2) + "\n")
    return 0
  }

  // -- done --

  if (subcmd === "done") {
    const n = parseInt(rest[0], 10)
    if (!n || n < 1) {
      process.stdout.write(JSON.stringify(error({ index: [{ code: "invalid", message: "provide a valid todo number" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const todos = load_todos(path)
    const target = todos.find(t => t.index === n)
    if (!target) {
      process.stdout.write(JSON.stringify(error({ index: [{ code: "not_found", message: `no todo #${n}` }] }, meta()), null, 2) + "\n")
      return 1
    }

    target.done = true
    save_todos(path, todos)

    process.stdout.write(JSON.stringify(success({ action: "done", index: n, text: target.text }, meta()), null, 2) + "\n")
    return 0
  }

  // -- rm --

  if (subcmd === "rm") {
    const n = parseInt(rest[0], 10)
    if (!n || n < 1) {
      process.stdout.write(JSON.stringify(error({ index: [{ code: "invalid", message: "provide a valid todo number" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const todos = load_todos(path)
    const target = todos.find(t => t.index === n)
    if (!target) {
      process.stdout.write(JSON.stringify(error({ index: [{ code: "not_found", message: `no todo #${n}` }] }, meta()), null, 2) + "\n")
      return 1
    }

    const remaining = todos.filter(t => t.index !== n)
    save_todos(path, remaining)

    process.stdout.write(JSON.stringify(success({ action: "rm", index: n, text: target.text }, meta()), null, 2) + "\n")
    return 0
  }

  // -- promote --

  if (subcmd === "promote") {
    const n = parseInt(rest[0], 10)
    if (!n || n < 1) {
      process.stdout.write(JSON.stringify(error({ index: [{ code: "invalid", message: "provide a valid todo number" }] }, meta()), null, 2) + "\n")
      return 1
    }

    const todos = load_todos(path)
    const target = todos.find(t => t.index === n)
    if (!target) {
      process.stdout.write(JSON.stringify(error({ index: [{ code: "not_found", message: `no todo #${n}` }] }, meta()), null, 2) + "\n")
      return 1
    }

    // check gh
    const gh_check = Bun.spawnSync(["which", "gh"], { stdout: "pipe", stderr: "pipe" })
    if (gh_check.exitCode !== 0) {
      process.stdout.write(JSON.stringify(error({ gh: [{ code: "not_found", message: "gh CLI not found on PATH" }] }, meta()), null, 2) + "\n")
      return 1
    }

    // create issue
    const proc = Bun.spawnSync(["gh", "issue", "create", "--title", target.text, "--body", `Promoted from bny todo #${n}`], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: root,
    })

    if (proc.exitCode !== 0) {
      const err = new TextDecoder().decode(proc.stderr).trim()
      process.stdout.write(JSON.stringify(error({ gh: [{ code: "failed", message: `gh issue create failed: ${err}` }] }, meta()), null, 2) + "\n")
      return 1
    }

    // parse issue url → number
    const url = new TextDecoder().decode(proc.stdout).trim()
    const issue_match = url.match(/\/(\d+)$/)
    const issue_number = issue_match ? issue_match[1] : url

    target.done = true
    target.text = `${target.text} (\u2192 #${issue_number})`
    save_todos(path, todos)

    process.stdout.write(JSON.stringify(success({ action: "promote", index: n, text: target.text, issue: issue_number, url }, meta()), null, 2) + "\n")
    return 0
  }

  // -- unknown --

  process.stderr.write(`bny todo: unknown command '${subcmd}'\n`)
  return 1
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
