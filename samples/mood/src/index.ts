//
// index.ts - entry point
//

import app from "./app.ts"
import { handler as ping } from "./handlers/ping.ts"
import { handler as health } from "./handlers/health.ts"
import { handler as create_mood } from "./handlers/create_mood.ts"
import { handler as list_moods } from "./handlers/list_moods.ts"
import { handler as trends } from "./handlers/trends.ts"
import { handler as trends_team } from "./handlers/trends_team.ts"
import { handler as trends_person } from "./handlers/trends_person.ts"

app.register("/ping", ping)
app.register("/health", health)
app.register("/moods/create", create_mood)
app.register("/moods/list", list_moods)
app.register("/trends", trends)
app.register("/trends/team", trends_team)
app.register("/trends/person", trends_person)
