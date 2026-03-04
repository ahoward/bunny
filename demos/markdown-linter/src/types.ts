import type { Root, Content } from "mdast"

export type Severity = "error" | "warning" | "info"

export type Diagnostic = {
  file: string
  line: number
  column: number
  severity: Severity
  rule: string
  message: string
}

export type LineRuleContext = {
  file: string
  lines: string[]
  content: string
}

export type AstRuleContext = {
  file: string
  ast: Root
  content: string
}

export type LineRule = {
  name: string
  kind: "line"
  check: (ctx: LineRuleContext) => Diagnostic[]
}

export type AstRule = {
  name: string
  kind: "ast"
  check: (ctx: AstRuleContext) => Diagnostic[]
}

export type Rule = LineRule | AstRule
