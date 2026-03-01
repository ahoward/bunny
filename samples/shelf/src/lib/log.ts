//
// log.ts - structured call logging
//

export interface LogEntry {
  path:        string
  status:      "success" | "error"
  duration_ms: number
  timestamp:   string
}

const enabled = process.env.BUNNY_LOG !== "0"

export function log_call(entry: LogEntry): void {
  if (!enabled) return
  process.stderr.write(JSON.stringify(entry) + "\n")
}
