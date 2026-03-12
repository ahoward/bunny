//
// progress.ts — structured JSONL progress events on stderr
//
// always on. every line is valid JSON. consumers filter with:
//   try { JSON.parse(line) } — if it parses, it's an event.
//
// events:
//   spawn_start  — subprocess launched
//   spawn_done   — subprocess exited
//

export interface SpawnStartEvent {
  event:        "spawn_start"
  cmd:          string       // first arg (e.g. "claude", "gemini")
  label:        string | null
  ts:           string
}

export interface SpawnDoneEvent {
  event:        "spawn_done"
  cmd:          string
  label:        string | null
  exit_code:    number
  ok:           boolean
  timed_out:    boolean
  duration_ms:  number
  stdout_bytes: number
  ts:           string
}

export type ProgressEvent = SpawnStartEvent | SpawnDoneEvent

export function emit(event: ProgressEvent): void {
  process.stderr.write(JSON.stringify(event) + "\n")
}

export function spawn_start(cmd: string[], label: string | null): string {
  const ts = new Date().toISOString()
  emit({ event: "spawn_start", cmd: cmd[0], label, ts })
  return ts
}

export function spawn_done(
  cmd: string[],
  label: string | null,
  exit_code: number,
  ok: boolean,
  timed_out: boolean,
  start_ts: string,
  stdout_bytes: number,
): void {
  const now = new Date()
  const duration_ms = now.getTime() - new Date(start_ts).getTime()
  emit({
    event: "spawn_done",
    cmd: cmd[0],
    label,
    exit_code,
    ok,
    timed_out,
    duration_ms,
    stdout_bytes,
    ts: now.toISOString(),
  })
}
