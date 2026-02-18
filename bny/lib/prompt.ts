//
// bny/lib/prompt.ts — shared prompt assembly for AI subcommands
//
// provides: read_section, build_prompt, PromptSection
//

import { readFileSync, existsSync } from "node:fs"

export interface PromptSection {
  heading: string
  content: string
}

export function read_section(heading: string, file_path: string): PromptSection | null {
  if (!existsSync(file_path)) return null
  const content = readFileSync(file_path, "utf-8").trim()
  if (content.length === 0) return null
  return { heading, content }
}

export function build_prompt(sections: PromptSection[], instructions: string): string {
  const parts: string[] = []

  for (const section of sections) {
    parts.push(`# ${section.heading}\n\n${section.content}`)
  }

  parts.push(`# Instructions\n\n${instructions}`)

  return parts.join("\n\n---\n\n")
}
