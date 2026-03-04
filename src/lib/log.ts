//
// log.ts - structured call logging
//
// writes JSON lines to stderr for every app.call.
// quiet by default. enable with BUNNY_LOG=1.
//

export interface LogEntry {
  path:        string
  status:      "success" | "error"
  duration_ms: number
  timestamp:   string
}

const enabled = process.env.BUNNY_LOG === "1"

export function log_call(entry: LogEntry): void {
  if (!enabled) return
  process.stderr.write(JSON.stringify(entry) + "\n")
}
