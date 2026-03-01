//
// bny/lib/map.ts — tree-sitter structural codebase map
//
// parses source files, extracts symbols (functions, classes, types, imports),
// and produces a structural summary. supports multiple languages via WASM grammars.
//

import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs"
import { resolve, relative, extname, dirname } from "node:path"
import { call_claude, parse_json } from "./brane.ts"

// -- types --

export interface MapSymbol {
  kind:       "function" | "class" | "type" | "interface" | "constant" | "method" | "module"
  name:       string
  signature:  string | null
  line:       number
  children:   MapSymbol[]
}

export interface FileMap {
  path:       string
  language:   string
  imports:    string[]
  symbols:    MapSymbol[]
}

export interface CodebaseMap {
  files:      FileMap[]
  stats:      { total_files: number, by_language: Record<string, number> }
}

// -- language config --

interface LangConfig {
  language:  string
  wasm:      string
  extract:   (root: any) => { symbols: MapSymbol[], imports: string[] }
}

const SKIP_DIRS = new Set([
  "node_modules", "__pycache__", ".git", ".bny", "vendor", "dist", "build",
  "target", ".next", ".nuxt", "coverage", "tmp", ".bundle",
])

function should_skip_dir(name: string): boolean {
  return name.startsWith(".") || SKIP_DIRS.has(name)
}

// -- tree-sitter setup --

let _parser: any = null
let _loaded_langs: Record<string, any> = {}

async function get_parser(): Promise<any> {
  if (_parser) return _parser
  const { Parser } = require("web-tree-sitter")
  await Parser.init()
  _parser = new Parser()
  return _parser
}

async function load_language(wasm_name: string): Promise<any> {
  if (_loaded_langs[wasm_name]) return _loaded_langs[wasm_name]
  const { Language } = require("web-tree-sitter")
  const wasm_path = resolve(__dirname, "../../node_modules/tree-sitter-wasms/out", wasm_name)
  if (!existsSync(wasm_path)) return null
  const lang = await Language.load(wasm_path)
  _loaded_langs[wasm_name] = lang
  return lang
}

// -- helpers --

function node_text(node: any): string {
  return node?.text || ""
}

function first_named_child_of_type(node: any, type: string): any {
  for (let i = 0; i < node.namedChildCount; i++) {
    if (node.namedChild(i).type === type) return node.namedChild(i)
  }
  return null
}

function named_children_of_type(node: any, ...types: string[]): any[] {
  const result: any[] = []
  for (let i = 0; i < node.namedChildCount; i++) {
    if (types.includes(node.namedChild(i).type)) result.push(node.namedChild(i))
  }
  return result
}

// -- typescript/tsx extractor --

function extract_ts_signature(func_node: any): string | null {
  const params = first_named_child_of_type(func_node, "formal_parameters")
  const ret = first_named_child_of_type(func_node, "type_annotation")
  if (!params) return null
  return node_text(params) + (ret ? node_text(ret) : "")
}

function extract_ts_class_methods(class_node: any): MapSymbol[] {
  const body = first_named_child_of_type(class_node, "class_body")
  if (!body) return []
  const methods: MapSymbol[] = []
  for (const child of named_children_of_type(body, "method_definition", "public_field_definition")) {
    if (child.type === "method_definition") {
      const name_node = first_named_child_of_type(child, "property_identifier")
      const params = first_named_child_of_type(child, "formal_parameters")
      const ret = first_named_child_of_type(child, "type_annotation")
      if (name_node) {
        methods.push({
          kind: "method",
          name: node_text(name_node),
          signature: params ? node_text(params) + (ret ? node_text(ret) : "") : null,
          line: child.startPosition.row + 1,
          children: [],
        })
      }
    }
  }
  return methods
}

function extract_typescript(root: any): { symbols: MapSymbol[], imports: string[] } {
  const symbols: MapSymbol[] = []
  const imports: string[] = []

  for (let i = 0; i < root.namedChildCount; i++) {
    const node = root.namedChild(i)

    // imports
    if (node.type === "import_statement") {
      const src = first_named_child_of_type(node, "string")
      if (src) {
        const frag = first_named_child_of_type(src, "string_fragment")
        imports.push(frag ? node_text(frag) : node_text(src))
      }
      continue
    }

    // exports
    if (node.type === "export_statement") {
      const decl = node.namedChild(0)
      if (!decl) continue

      if (decl.type === "function_declaration") {
        const name = first_named_child_of_type(decl, "identifier")
        symbols.push({
          kind: "function",
          name: name ? node_text(name) : "(anonymous)",
          signature: extract_ts_signature(decl),
          line: node.startPosition.row + 1,
          children: [],
        })
      } else if (decl.type === "class_declaration") {
        const name = first_named_child_of_type(decl, "type_identifier")
        symbols.push({
          kind: "class",
          name: name ? node_text(name) : "(anonymous)",
          signature: null,
          line: node.startPosition.row + 1,
          children: extract_ts_class_methods(decl),
        })
      } else if (decl.type === "interface_declaration") {
        const name = first_named_child_of_type(decl, "type_identifier")
        symbols.push({
          kind: "interface",
          name: name ? node_text(name) : "(anonymous)",
          signature: null,
          line: node.startPosition.row + 1,
          children: [],
        })
      } else if (decl.type === "type_alias_declaration") {
        const name = first_named_child_of_type(decl, "type_identifier")
        symbols.push({
          kind: "type",
          name: name ? node_text(name) : "(anonymous)",
          signature: null,
          line: node.startPosition.row + 1,
          children: [],
        })
      } else if (decl.type === "lexical_declaration") {
        const declarator = first_named_child_of_type(decl, "variable_declarator")
        if (declarator) {
          const name = first_named_child_of_type(declarator, "identifier")
          symbols.push({
            kind: "constant",
            name: name ? node_text(name) : "(anonymous)",
            signature: null,
            line: node.startPosition.row + 1,
            children: [],
          })
        }
      }
    }
  }

  return { symbols, imports }
}

// -- ruby extractor --

function extract_ruby_methods(body_node: any): MapSymbol[] {
  const methods: MapSymbol[] = []
  for (let i = 0; i < body_node.namedChildCount; i++) {
    const child = body_node.namedChild(i)
    if (child.type === "method") {
      const name = first_named_child_of_type(child, "identifier")
      const params = first_named_child_of_type(child, "method_parameters")
      methods.push({
        kind: "method",
        name: name ? node_text(name) : "(anonymous)",
        signature: params ? node_text(params) : null,
        line: child.startPosition.row + 1,
        children: [],
      })
    }
  }
  return methods
}

function extract_ruby_classes(node: any): MapSymbol[] {
  const symbols: MapSymbol[] = []
  const body = first_named_child_of_type(node, "body_statement")
  if (!body) return symbols

  for (let i = 0; i < body.namedChildCount; i++) {
    const child = body.namedChild(i)

    if (child.type === "class") {
      const name = first_named_child_of_type(child, "constant")
      const superclass = first_named_child_of_type(child, "superclass")
      const class_body = first_named_child_of_type(child, "body_statement")
      symbols.push({
        kind: "class",
        name: (name ? node_text(name) : "(anonymous)") + (superclass ? " " + node_text(superclass) : ""),
        signature: null,
        line: child.startPosition.row + 1,
        children: class_body ? extract_ruby_methods(class_body) : [],
      })
    } else if (child.type === "method") {
      const name = first_named_child_of_type(child, "identifier")
      const params = first_named_child_of_type(child, "method_parameters")
      symbols.push({
        kind: "method",
        name: name ? node_text(name) : "(anonymous)",
        signature: params ? node_text(params) : null,
        line: child.startPosition.row + 1,
        children: [],
      })
    }
  }

  return symbols
}

function extract_ruby(root: any): { symbols: MapSymbol[], imports: string[] } {
  const symbols: MapSymbol[] = []
  const imports: string[] = []

  for (let i = 0; i < root.namedChildCount; i++) {
    const node = root.namedChild(i)

    // require / require_relative
    if (node.type === "call") {
      const method = first_named_child_of_type(node, "identifier")
      if (method && (node_text(method) === "require" || node_text(method) === "require_relative")) {
        const args = first_named_child_of_type(node, "argument_list")
        if (args) {
          const str = first_named_child_of_type(args, "string")
          if (str) imports.push(node_text(str).replace(/^["']|["']$/g, ""))
        }
      }
      continue
    }

    // module
    if (node.type === "module") {
      const name = first_named_child_of_type(node, "constant")
      symbols.push({
        kind: "module",
        name: name ? node_text(name) : "(anonymous)",
        signature: null,
        line: node.startPosition.row + 1,
        children: extract_ruby_classes(node),
      })
      continue
    }

    // top-level class
    if (node.type === "class") {
      const name = first_named_child_of_type(node, "constant")
      const superclass = first_named_child_of_type(node, "superclass")
      const body = first_named_child_of_type(node, "body_statement")
      symbols.push({
        kind: "class",
        name: (name ? node_text(name) : "(anonymous)") + (superclass ? " " + node_text(superclass) : ""),
        signature: null,
        line: node.startPosition.row + 1,
        children: body ? extract_ruby_methods(body) : [],
      })
      continue
    }

    // top-level method
    if (node.type === "method") {
      const name = first_named_child_of_type(node, "identifier")
      const params = first_named_child_of_type(node, "method_parameters")
      symbols.push({
        kind: "function",
        name: name ? node_text(name) : "(anonymous)",
        signature: params ? node_text(params) : null,
        line: node.startPosition.row + 1,
        children: [],
      })
    }
  }

  return { symbols, imports }
}

// -- python extractor --

function extract_python_methods(block_node: any): MapSymbol[] {
  const methods: MapSymbol[] = []
  for (let i = 0; i < block_node.namedChildCount; i++) {
    const child = block_node.namedChild(i)
    if (child.type === "function_definition") {
      const name = first_named_child_of_type(child, "identifier")
      const params = first_named_child_of_type(child, "parameters")
      const ret = first_named_child_of_type(child, "type")
      methods.push({
        kind: "method",
        name: name ? node_text(name) : "(anonymous)",
        signature: params ? node_text(params) + (ret ? " -> " + node_text(ret) : "") : null,
        line: child.startPosition.row + 1,
        children: [],
      })
    }
  }
  return methods
}

function extract_python(root: any): { symbols: MapSymbol[], imports: string[] } {
  const symbols: MapSymbol[] = []
  const imports: string[] = []

  for (let i = 0; i < root.namedChildCount; i++) {
    const node = root.namedChild(i)

    // import os
    if (node.type === "import_statement") {
      const name = first_named_child_of_type(node, "dotted_name")
      if (name) imports.push(node_text(name))
      continue
    }

    // from X import Y
    if (node.type === "import_from_statement") {
      const rel = first_named_child_of_type(node, "relative_import")
      const dotted = first_named_child_of_type(node, "dotted_name")
      if (rel) imports.push(node_text(rel))
      else if (dotted) imports.push(node_text(dotted))
      continue
    }

    // class
    if (node.type === "class_definition") {
      const name = first_named_child_of_type(node, "identifier")
      const args = first_named_child_of_type(node, "argument_list")
      const block = first_named_child_of_type(node, "block")
      symbols.push({
        kind: "class",
        name: (name ? node_text(name) : "(anonymous)") + (args ? node_text(args) : ""),
        signature: null,
        line: node.startPosition.row + 1,
        children: block ? extract_python_methods(block) : [],
      })
      continue
    }

    // function
    if (node.type === "function_definition") {
      const name = first_named_child_of_type(node, "identifier")
      const params = first_named_child_of_type(node, "parameters")
      const ret = first_named_child_of_type(node, "type")
      symbols.push({
        kind: "function",
        name: name ? node_text(name) : "(anonymous)",
        signature: params ? node_text(params) + (ret ? " -> " + node_text(ret) : "") : null,
        line: node.startPosition.row + 1,
        children: [],
      })
      continue
    }

    // top-level constant assignment: FOO = ...
    if (node.type === "expression_statement") {
      const assign = first_named_child_of_type(node, "assignment")
      if (assign) {
        const left = assign.namedChild(0)
        if (left && left.type === "identifier" && node_text(left) === node_text(left).toUpperCase()) {
          symbols.push({
            kind: "constant",
            name: node_text(left),
            signature: null,
            line: node.startPosition.row + 1,
            children: [],
          })
        }
      }
    }
  }

  return { symbols, imports }
}

// -- go extractor --

function extract_go(root: any): { symbols: MapSymbol[], imports: string[] } {
  const symbols: MapSymbol[] = []
  const imports: string[] = []

  for (let i = 0; i < root.namedChildCount; i++) {
    const node = root.namedChild(i)

    // imports
    if (node.type === "import_declaration") {
      const spec_list = first_named_child_of_type(node, "import_spec_list")
      if (spec_list) {
        for (let j = 0; j < spec_list.namedChildCount; j++) {
          const spec = spec_list.namedChild(j)
          if (spec.type === "import_spec") {
            const path = first_named_child_of_type(spec, "interpreted_string_literal")
            if (path) imports.push(node_text(path).replace(/^"|"$/g, ""))
          } else if (spec.type === "interpreted_string_literal") {
            imports.push(node_text(spec).replace(/^"|"$/g, ""))
          }
        }
      }
      continue
    }

    // type declarations (struct, interface)
    if (node.type === "type_declaration") {
      const spec = first_named_child_of_type(node, "type_spec")
      if (spec) {
        const name = first_named_child_of_type(spec, "type_identifier")
        const kind_node = spec.namedChild(1) // struct_type or interface_type
        const kind = kind_node?.type === "interface_type" ? "interface" as const : "type" as const
        const name_str = name ? node_text(name) : "(anonymous)"
        // go exports = capitalized
        if (name_str[0] === name_str[0].toUpperCase()) {
          symbols.push({
            kind,
            name: name_str,
            signature: null,
            line: node.startPosition.row + 1,
            children: [],
          })
        }
      }
      continue
    }

    // function declaration
    if (node.type === "function_declaration") {
      const name = first_named_child_of_type(node, "identifier")
      const params = first_named_child_of_type(node, "parameter_list")
      const name_str = name ? node_text(name) : "(anonymous)"
      if (name_str[0] === name_str[0].toUpperCase()) {
        symbols.push({
          kind: "function",
          name: name_str,
          signature: params ? node_text(params) : null,
          line: node.startPosition.row + 1,
          children: [],
        })
      }
      continue
    }

    // method declaration
    if (node.type === "method_declaration") {
      const receiver = node.namedChild(0) // parameter_list (receiver)
      const field_id = first_named_child_of_type(node, "field_identifier")
      const name_str = field_id ? node_text(field_id) : "(anonymous)"
      if (name_str[0] === name_str[0].toUpperCase()) {
        const recv_text = receiver ? node_text(receiver) : ""
        symbols.push({
          kind: "method",
          name: name_str,
          signature: recv_text ? `receiver: ${recv_text}` : null,
          line: node.startPosition.row + 1,
          children: [],
        })
      }
    }
  }

  return { symbols, imports }
}

// -- language registry --

// built-in extractors (hand-written, accurate)
const BUILTIN_CONFIGS: Record<string, LangConfig> = {
  ".ts":  { language: "typescript",  wasm: "tree-sitter-typescript.wasm", extract: extract_typescript },
  ".tsx": { language: "tsx",         wasm: "tree-sitter-typescript.wasm", extract: extract_typescript },
  ".js":  { language: "javascript",  wasm: "tree-sitter-javascript.wasm", extract: extract_typescript },
  ".jsx": { language: "javascript",  wasm: "tree-sitter-javascript.wasm", extract: extract_typescript },
  ".mjs": { language: "javascript",  wasm: "tree-sitter-javascript.wasm", extract: extract_typescript },
  ".rb":  { language: "ruby",        wasm: "tree-sitter-ruby.wasm",       extract: extract_ruby },
  ".py":  { language: "python",      wasm: "tree-sitter-python.wasm",     extract: extract_python },
  ".go":  { language: "go",          wasm: "tree-sitter-go.wasm",         extract: extract_go },
}

// extensions with WASM grammars available but no built-in extractor
// these can be auto-generated on first encounter
const WASM_ONLY: Record<string, { language: string, wasm: string }> = {
  ".rs":    { language: "rust",       wasm: "tree-sitter-rust.wasm" },
  ".swift": { language: "swift",      wasm: "tree-sitter-swift.wasm" },
  ".java":  { language: "java",       wasm: "tree-sitter-java.wasm" },
  ".kt":    { language: "kotlin",     wasm: "tree-sitter-kotlin.wasm" },
  ".scala": { language: "scala",      wasm: "tree-sitter-scala.wasm" },
  ".c":     { language: "c",          wasm: "tree-sitter-c.wasm" },
  ".h":     { language: "c",          wasm: "tree-sitter-c.wasm" },
  ".cpp":   { language: "cpp",        wasm: "tree-sitter-cpp.wasm" },
  ".cc":    { language: "cpp",        wasm: "tree-sitter-cpp.wasm" },
  ".hpp":   { language: "cpp",        wasm: "tree-sitter-cpp.wasm" },
  ".cs":    { language: "c_sharp",    wasm: "tree-sitter-c_sharp.wasm" },
  ".ex":    { language: "elixir",     wasm: "tree-sitter-elixir.wasm" },
  ".exs":   { language: "elixir",     wasm: "tree-sitter-elixir.wasm" },
  ".lua":   { language: "lua",        wasm: "tree-sitter-lua.wasm" },
  ".php":   { language: "php",        wasm: "tree-sitter-php.wasm" },
  ".dart":  { language: "dart",       wasm: "tree-sitter-dart.wasm" },
  ".zig":   { language: "zig",        wasm: "tree-sitter-zig.wasm" },
  ".ml":    { language: "ocaml",      wasm: "tree-sitter-ocaml.wasm" },
  ".elm":   { language: "elm",        wasm: "tree-sitter-elm.wasm" },
  ".vue":   { language: "vue",        wasm: "tree-sitter-vue.wasm" },
  ".sh":    { language: "bash",       wasm: "tree-sitter-bash.wasm" },
  ".bash":  { language: "bash",       wasm: "tree-sitter-bash.wasm" },
}

// runtime cache for generated extractors (language name → extract function)
const _generated_extractors: Record<string, (root: any) => { symbols: MapSymbol[], imports: string[] }> = {}

// -- extractor generation --

function extractors_dir(root: string): string {
  return resolve(root, ".bny/map/extractors")
}

function extractor_path(root: string, language: string): string {
  return resolve(extractors_dir(root), `${language}.ts`)
}

function dump_ast(root_node: any, max_depth: number = 3): string {
  const lines: string[] = []

  function walk(node: any, depth: number): void {
    if (depth > max_depth) return
    const indent = "  ".repeat(depth)
    const text = node.text?.slice(0, 80).replace(/\n/g, "\\n") || ""
    lines.push(`${indent}${node.type} | ${text}`)
    for (let i = 0; i < node.namedChildCount; i++) {
      walk(node.namedChild(i), depth + 1)
    }
  }

  for (let i = 0; i < root_node.namedChildCount; i++) {
    walk(root_node.namedChild(i), 0)
  }

  return lines.join("\n")
}

async function find_sample_file(root: string, ext: string, dirs: string[]): Promise<string | null> {
  // find a representative source file for AST analysis
  for (const dir of dirs) {
    const abs = resolve(root, dir)
    if (!existsSync(abs) || !statSync(abs).isDirectory()) continue
    const sample = find_file_recursive(abs, ext, 0)
    if (sample) return sample
  }
  return null
}

function find_file_recursive(dir: string, ext: string, depth: number): string | null {
  if (depth > 5) return null
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (should_skip_dir(entry.name)) continue
      const found = find_file_recursive(resolve(dir, entry.name), ext, depth + 1)
      if (found) return found
    } else if (entry.name.endsWith(ext)) {
      const full = resolve(dir, entry.name)
      const content = readFileSync(full, "utf-8").trim()
      // pick a file with some substance (>5 lines)
      if (content.split("\n").length > 5) return full
    }
  }
  return null
}

// example extractor shown to claude as a few-shot reference
const EXAMPLE_EXTRACTOR = `// Example: TypeScript extractor (for reference)
// This shows the pattern — walk root.namedChildCount, check node.type, extract names.
//
// Available helpers (already imported for you):
//   node_text(node)                           → string (the source text of a node)
//   first_named_child_of_type(node, "type")   → child node or null
//   named_children_of_type(node, "t1", "t2")  → array of matching children
//
// node properties:
//   node.type            → string (AST node type like "function_declaration")
//   node.namedChildCount → number
//   node.namedChild(i)   → child node
//   node.startPosition   → { row: number, column: number }
//   node.text            → string (source text)

function extract_typescript(root) {
  const symbols = []
  const imports = []

  for (let i = 0; i < root.namedChildCount; i++) {
    const node = root.namedChild(i)

    if (node.type === "import_statement") {
      const src = first_named_child_of_type(node, "string")
      if (src) {
        const frag = first_named_child_of_type(src, "string_fragment")
        imports.push(frag ? node_text(frag) : node_text(src))
      }
      continue
    }

    if (node.type === "export_statement") {
      const decl = node.namedChild(0)
      if (!decl) continue

      if (decl.type === "function_declaration") {
        const name = first_named_child_of_type(decl, "identifier")
        const params = first_named_child_of_type(decl, "formal_parameters")
        symbols.push({
          kind: "function",
          name: name ? node_text(name) : "(anonymous)",
          signature: params ? node_text(params) : null,
          line: node.startPosition.row + 1,
          children: [],
        })
      }
      // ... similar for class_declaration, interface_declaration, etc.
    }
  }

  return { symbols, imports }
}`

async function generate_extractor(
  root: string,
  language: string,
  wasm: string,
  sample_path: string,
): Promise<((root: any) => { symbols: MapSymbol[], imports: string[] }) | null> {
  process.stderr.write(`[map] generating ${language} extractor...\n`)

  // parse the sample file to get the AST
  const content = readFileSync(sample_path, "utf-8")
  const parser = await get_parser()
  const lang = await load_language(wasm)
  if (!lang) return null

  parser.setLanguage(lang)
  const tree = parser.parse(content)
  const ast_dump = dump_ast(tree.rootNode, 3)

  const prompt = `# Task

Generate a tree-sitter extractor function for **${language}** source files.

# AST Shape

Here is the tree-sitter AST (3 levels deep) for a real ${language} file (${relative(root, sample_path)}):

\`\`\`
${ast_dump}
\`\`\`

# Source File

\`\`\`
${content.slice(0, 3000)}
\`\`\`

# Example Extractor

${EXAMPLE_EXTRACTOR}

# Requirements

Write a single JavaScript function called \`extract\` that:
1. Takes a tree-sitter root node as its only argument
2. Returns \`{ symbols: Symbol[], imports: string[] }\`
3. Extracts public/exported functions, classes, types, interfaces, methods, modules, constants
4. Extracts import/require/use statements
5. For classes with methods, nest methods as children

Symbol shape:
\`\`\`
{ kind: "function"|"class"|"type"|"interface"|"constant"|"method"|"module",
  name: string, signature: string|null, line: number, children: Symbol[] }
\`\`\`

Available helpers (already in scope, do NOT declare them):
- \`node_text(node)\` → string
- \`first_named_child_of_type(node, type)\` → node or null
- \`named_children_of_type(node, ...types)\` → node[]

Rules:
- Use the AST node types you see above — they are the actual types for this language
- Walk \`root.namedChildCount\` / \`root.namedChild(i)\`
- Use \`node.startPosition.row + 1\` for line numbers
- Return empty arrays if nothing found
- For languages with visibility (pub, public, export), only include public symbols
- Keep it under 80 lines

Respond with ONLY the JavaScript function body. No markdown fences, no explanation.
Start with \`function extract(root) {\` and end with \`}\`.
`

  const raw = call_claude(prompt, root)
  if (!raw) {
    process.stderr.write(`[map] failed to generate ${language} extractor\n`)
    return null
  }

  // clean up response
  let code = raw.trim()
  if (code.startsWith("```")) {
    code = code.replace(/^```(?:javascript|js|typescript|ts)?\n?/, "").replace(/\n?```$/, "")
  }

  // validate it looks like a function
  if (!code.includes("function extract")) {
    process.stderr.write(`[map] generated code doesn't contain extract function\n`)
    return null
  }

  // cache to disk
  const dir = extractors_dir(root)
  mkdirSync(dir, { recursive: true })
  const cached_path = extractor_path(root, language)

  // strip any module.exports line claude might add
  code = code.replace(/\n?module\.exports\s*=\s*\{[^}]*\}\s*;?\s*$/, "")

  const file_content = `//
// auto-generated ${language} extractor for bny map
// generated from: ${relative(root, sample_path)}
// delete this file to regenerate
//
// helpers available: node_text, first_named_child_of_type, named_children_of_type
//

${code}
`
  writeFileSync(cached_path, file_content)
  process.stderr.write(`[map] cached: ${relative(root, cached_path)}\n`)

  // load it
  return load_extractor_from_file(cached_path)
}

function load_extractor_from_file(path: string): ((root: any) => { symbols: MapSymbol[], imports: string[] }) | null {
  try {
    let code = readFileSync(path, "utf-8")

    // strip comments at the top
    code = code.replace(/^\/\/[^\n]*\n/gm, "")
    // strip any module.exports
    code = code.replace(/module\.exports\s*=\s*\{[^}]*\}\s*;?\s*/, "")

    const fn = new Function(
      "node_text",
      "first_named_child_of_type",
      "named_children_of_type",
      `${code.trim()}\nreturn extract;`
    )

    return fn(node_text, first_named_child_of_type, named_children_of_type)
  } catch (e: any) {
    process.stderr.write(`[map] failed to load extractor from ${path}: ${e.message}\n`)
    return null
  }
}

async function get_or_generate_extractor(
  root: string,
  language: string,
  wasm: string,
  scan_dirs: string[],
): Promise<((root: any) => { symbols: MapSymbol[], imports: string[] }) | null> {
  // 1. check runtime cache
  if (_generated_extractors[language]) return _generated_extractors[language]

  // 2. check disk cache
  const cached = extractor_path(root, language)
  if (existsSync(cached)) {
    const fn = load_extractor_from_file(cached)
    if (fn) {
      _generated_extractors[language] = fn
      return fn
    }
  }

  // 3. find a sample file and generate
  const ext_for_lang = Object.entries(WASM_ONLY).find(([_, v]) => v.language === language)?.[0]
  if (!ext_for_lang) return null

  const sample = await find_sample_file(root, ext_for_lang, scan_dirs)
  if (!sample) return null

  const fn = await generate_extractor(root, language, wasm, sample)
  if (fn) _generated_extractors[language] = fn
  return fn
}

// -- core functions --

// track scan dirs for extractor generation context
let _current_scan_dirs: string[] = ["."]

export function detect_language(file_path: string): LangConfig | null {
  const ext = extname(file_path)
  return BUILTIN_CONFIGS[ext] || null
}

export function detect_any_language(file_path: string): { language: string, wasm: string } | null {
  const ext = extname(file_path)
  if (BUILTIN_CONFIGS[ext]) return BUILTIN_CONFIGS[ext]
  return WASM_ONLY[ext] || null
}

export async function parse_file(file_path: string, root: string): Promise<FileMap | null> {
  // try built-in extractor first
  const builtin = detect_language(file_path)
  if (builtin) {
    const content = readFileSync(file_path, "utf-8")
    if (content.trim().length === 0) return null

    const parser = await get_parser()
    const lang = await load_language(builtin.wasm)
    if (!lang) return null

    parser.setLanguage(lang)
    const tree = parser.parse(content)
    const { symbols, imports } = builtin.extract(tree.rootNode)
    if (symbols.length === 0 && imports.length === 0) return null

    return { path: relative(root, file_path), language: builtin.language, imports, symbols }
  }

  // try generated extractor for WASM-available languages
  const wasm_info = detect_any_language(file_path)
  if (!wasm_info) return null

  const extractor = await get_or_generate_extractor(root, wasm_info.language, wasm_info.wasm, _current_scan_dirs)
  if (!extractor) return null

  const content = readFileSync(file_path, "utf-8")
  if (content.trim().length === 0) return null

  const parser = await get_parser()
  const lang = await load_language(wasm_info.wasm)
  if (!lang) return null

  parser.setLanguage(lang)
  const tree = parser.parse(content)
  const { symbols, imports } = extractor(tree.rootNode)
  if (symbols.length === 0 && imports.length === 0) return null

  return { path: relative(root, file_path), language: wasm_info.language, imports, symbols }
}

function walk_dir(dir: string, root: string, files: string[]): void {
  if (!existsSync(dir)) return

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name)

    if (entry.isDirectory()) {
      if (should_skip_dir(entry.name)) continue
      walk_dir(full, root, files)
      continue
    }

    if (detect_any_language(entry.name)) {
      files.push(full)
    }
  }
}

export async function map_codebase(root: string, dirs: string[]): Promise<CodebaseMap> {
  _current_scan_dirs = dirs
  const file_paths: string[] = []
  for (const dir of dirs) {
    const abs = resolve(root, dir)
    if (existsSync(abs) && statSync(abs).isDirectory()) {
      walk_dir(abs, root, file_paths)
    }
  }

  file_paths.sort()

  const files: FileMap[] = []
  const by_language: Record<string, number> = {}

  for (const fp of file_paths) {
    try {
      const fm = await parse_file(fp, root)
      if (fm) {
        files.push(fm)
        by_language[fm.language] = (by_language[fm.language] || 0) + 1
      }
    } catch {
      // skip unparseable files
    }
  }

  return {
    files,
    stats: { total_files: files.length, by_language },
  }
}

// -- formatting --

export function format_markdown(map: CodebaseMap): string {
  const lines: string[] = ["# Codebase Map", ""]

  // stats
  const lang_parts = Object.entries(map.stats.by_language)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => `${lang}: ${count}`)
  lines.push(`${map.stats.total_files} files (${lang_parts.join(", ")})`, "")

  for (const file of map.files) {
    lines.push(`## ${file.path} (${file.language})`)

    if (file.imports.length > 0) {
      lines.push(`imports: ${file.imports.join(", ")}`)
    }

    for (const sym of file.symbols) {
      const sig = sym.signature ? sym.signature : ""
      lines.push(`- \`${sym.kind} ${sym.name}${sig}\``)

      for (const child of sym.children) {
        const csig = child.signature ? child.signature : ""
        lines.push(`  - \`${child.kind} ${child.name}${csig}\``)
      }
    }

    lines.push("")
  }

  return lines.join("\n")
}

export function format_json(map: CodebaseMap): string {
  return JSON.stringify(map, null, 2)
}
