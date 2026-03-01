//
// export_bookmarks.ts - export all bookmarks as formatted markdown
//
// returns all bookmarks grouped by tag as a markdown document.
// bookmarks with no tags appear under "Untagged".
// bookmarks with multiple tags appear under each tag.
//

import type { Params, Emit } from "../lib/types.ts"
import type { Bookmark } from "../lib/types.ts"
import { success } from "../lib/result.ts"
import { read_bookmarks } from "../lib/store.ts"

function format_bookmark(b: Bookmark): string {
  const title = b.title || b.url
  let line = `- [${title}](${b.url})`
  if (b.notes) line += `\n  > ${b.notes}`
  return line
}

function build_markdown(bookmarks: Bookmark[]): string {
  if (bookmarks.length === 0) return "# Bookmarks\n\nNo bookmarks saved.\n"

  const groups: Map<string, Bookmark[]> = new Map()

  for (const b of bookmarks) {
    if (b.tags.length === 0) {
      const list = groups.get("Untagged") || []
      list.push(b)
      groups.set("Untagged", list)
    } else {
      for (const tag of b.tags) {
        const list = groups.get(tag) || []
        list.push(b)
        groups.set(tag, list)
      }
    }
  }

  const lines: string[] = ["# Bookmarks", ""]

  // sorted tag sections, with Untagged last
  const tags = Array.from(groups.keys()).sort((a, b) => {
    if (a === "Untagged") return 1
    if (b === "Untagged") return -1
    return a.localeCompare(b)
  })

  for (const tag of tags) {
    lines.push(`## ${tag}`, "")
    for (const b of groups.get(tag)!) {
      lines.push(format_bookmark(b))
    }
    lines.push("")
  }

  return lines.join("\n")
}

export async function handler(_params: Params, _emit?: Emit) {
  const bookmarks = read_bookmarks()
  const markdown = build_markdown(bookmarks)
  return success({ markdown, count: bookmarks.length })
}
