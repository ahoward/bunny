//
// index.ts - handler registration
//

import app from "./app.ts"
import { handler as ping } from "./handlers/ping.ts"
import { handler as save_bookmark } from "./handlers/save_bookmark.ts"
import { handler as list_bookmarks } from "./handlers/list_bookmarks.ts"
import { handler as delete_bookmark } from "./handlers/delete_bookmark.ts"
import { handler as export_bookmarks } from "./handlers/export_bookmarks.ts"

app.register("/ping", ping)
app.register("/bookmarks/save", save_bookmark)
app.register("/bookmarks/list", list_bookmarks)
app.register("/bookmarks/delete", delete_bookmark)
app.register("/bookmarks/export", export_bookmarks)
