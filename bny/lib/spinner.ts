//
// bny/lib/spinner.ts — bunny-themed terminal spinner
//
// TTY-aware progress indicator. writes to stderr.
// degrades to plain text when piped or in CI.
//
// usage:
//   const spin = create_spinner("eating: README.md")
//   await long_operation()
//   spin.stop("🐰 ate README.md")
//

export interface Spinner {
  update: (text: string) => void
  stop:   (final?: string) => void
}

const FRAMES = ["🐇", "🐰", "🐇", "🐰"]
const INTERVAL_MS = 250

function is_tty(): boolean {
  if (process.env.CI) return false
  if (process.env.BNY_NO_SPINNER) return false
  return !!process.stderr.isTTY
}

export function create_spinner(text: string): Spinner {
  if (!is_tty()) {
    process.stderr.write(`${text}...\n`)
    return { update: () => {}, stop: () => {} }
  }

  let message = text
  let frame_idx = 0
  const start = Date.now()

  function render(): void {
    const elapsed = Math.floor((Date.now() - start) / 1000)
    const frame = FRAMES[frame_idx % FRAMES.length]
    const time = elapsed > 0 ? `  (${elapsed}s)` : ""
    process.stderr.write(`\r\x1b[K${frame} ${message}${time}`)
    frame_idx++
  }

  render()
  const timer = setInterval(render, INTERVAL_MS)

  function stop(final?: string): void {
    clearInterval(timer)
    process.stderr.write("\r\x1b[K")
    if (final) {
      process.stderr.write(`${final}\n`)
    }
  }

  function update(new_text: string): void {
    message = new_text
  }

  return { update, stop }
}
