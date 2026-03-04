import { fizzbuzz, fizzbuzz_range } from "./fizzbuzz";
import { parse_positive_int, validate_range } from "./validate";

function json_response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function error_response(message: string, status = 400): Response {
  return json_response({ error: "invalid_input", message }, status);
}

function handle_single(number_str: string): Response {
  const parsed = parse_positive_int(number_str);
  if (!parsed.ok) return error_response(parsed.message);
  return json_response({ input: parsed.value, result: fizzbuzz(parsed.value) });
}

function handle_range(url: URL): Response {
  const from_raw = url.searchParams.get("from");
  const to_raw = url.searchParams.get("to");
  const validated = validate_range(from_raw, to_raw);
  if (!validated.ok) return error_response(validated.message);
  return json_response({
    from: validated.from,
    to: validated.to,
    results: fizzbuzz_range(validated.from, validated.to),
  });
}

export function route(req: Request): Response {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/health") {
    return json_response({ status: "ok" });
  }

  const single_match = path.match(/^\/fizzbuzz\/(.+)$/);
  if (single_match) {
    return handle_single(single_match[1]);
  }

  if (path === "/fizzbuzz") {
    return handle_range(url);
  }

  return json_response({ error: "not_found", message: `No route for ${path}` }, 404);
}

const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  fetch: route,
});

console.log(`fizzbuzz-api listening on http://localhost:${server.port}`);
