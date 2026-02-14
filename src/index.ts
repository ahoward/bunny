//
// index.ts - entry point
//

import app from "./app.ts"
import { handler as ping } from "./handlers/ping.ts"

app.register("/ping", ping)
