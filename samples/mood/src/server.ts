//
// server.ts - Bun.serve HTTP layer
//

import app from "./app.ts"
import "./index.ts"

const PORT = parseInt(process.env.PORT || "3000", 10)

const server = Bun.serve({
  port: PORT,

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    let params: unknown = null

    if (method === "POST" || method === "PUT" || method === "PATCH") {
      try {
        const body = await request.text()
        params = body ? JSON.parse(body) : null
      } catch {
        return new Response(
          JSON.stringify({
            status: "error",
            result: null,
            errors: { body: [{ code: "invalid_json", message: "request body is not valid JSON" }] },
            meta: { path, timestamp: new Date().toISOString(), duration_ms: 0 }
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }
    } else if (url.search) {
      params = Object.fromEntries(url.searchParams)
    }

    const result = await app.call(path, params)

    const status_code = result.status === "success" ? 200 :
      result.errors?.path ? 404 : 400

    return new Response(JSON.stringify(result), {
      status: status_code,
      headers: { "Content-Type": "application/json" }
    })
  }
})

console.log(`mood server listening on http://localhost:${server.port}`)
