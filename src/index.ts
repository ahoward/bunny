//
// index.ts - entry point
//

import app from "./app.ts"
import { handler as ping } from "./handlers/ping.ts"
import { handler as health } from "./handlers/health.ts"

app.register("/ping", ping)
app.register("/health", health)
