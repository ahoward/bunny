import { unified } from "unified"
import remark_parse from "remark-parse"
import type { Root } from "mdast"

const parser = unified().use(remark_parse)

export function parse_markdown(content: string): Root {
  return parser.parse(content)
}
