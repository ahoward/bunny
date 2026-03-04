import type { Rule } from "../types"
import { trailing_whitespace } from "./trailing_whitespace"
import { no_multiple_blanks } from "./no_multiple_blanks"
import { heading_hierarchy } from "./heading_hierarchy"
import { final_newline } from "./final_newline"

export const all_rules: Rule[] = [
  trailing_whitespace,
  no_multiple_blanks,
  heading_hierarchy,
  final_newline,
]
