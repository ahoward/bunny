//
// store.ts - filesystem JSON store for mood entries
//
// reads and writes data/moods.json.
// creates the data directory on first write.
//

import { join } from "path"
import type { MoodEntry } from "./types.ts"

const DATA_DIR = join(import.meta.dir, "../../data")
const MOODS_FILE = join(DATA_DIR, "moods.json")

export async function read_moods(): Promise<MoodEntry[]> {
  try {
    const file = Bun.file(MOODS_FILE)
    const exists = await file.exists()
    if (!exists) return []
    const text = await file.text()
    return JSON.parse(text) as MoodEntry[]
  } catch {
    return []
  }
}

export async function write_moods(moods: MoodEntry[]): Promise<void> {
  const { mkdir } = await import("fs/promises")
  await mkdir(DATA_DIR, { recursive: true })
  await Bun.write(MOODS_FILE, JSON.stringify(moods, null, 2))
}

export async function append_mood(entry: MoodEntry): Promise<void> {
  const moods = await read_moods()
  moods.push(entry)
  await write_moods(moods)
}

export async function clear_moods(): Promise<void> {
  await write_moods([])
}
