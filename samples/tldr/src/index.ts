//
// index.ts - entry point
//

import app from "./app.ts"
import { handler as ping } from "./handlers/ping.ts"
import { handler as summarize } from "./handlers/summarize.ts"

app.register("/ping", ping)
app.register("/summarize", summarize)
