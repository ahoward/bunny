//
// index.ts - entry point
//

import app from "./app.ts"
import { handler as ping } from "./handlers/ping.ts"
import { handler as health } from "./handlers/health.ts"
import { handler as version } from "./handlers/version.ts"

app.register("/ping", ping)
app.register("/health", health)
app.register("/version", version)

export { app }
