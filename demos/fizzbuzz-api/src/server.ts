import { fizzbuzz, fizzbuzz_range } from "./fizzbuzz";
import { parse_positive_int } from "./validation";
import type { ErrorResponse } from "./types";

const MAX_RANGE = 1000;

function json_response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function error_response(code: string, message: string, status: number, param?: string): Response {
  const body: ErrorResponse = { error: { code, message } };
  if (param) body.error.param = param;
  return json_response(body, status);
}

function handle_single(n_str: string): Response {
  const n = parse_positive_int(n_str);
  if (n === null) {
    return error_response("INVALID_INPUT", `Expected a positive integer, got '${n_str}'`, 400, "n");
  }
  return json_response({ number: n, result: fizzbuzz(n) });
}

function handle_range(url: URL): Response {
  const from_str = url.searchParams.get("from");
  const to_str = url.searchParams.get("to");

  if (!from_str || !to_str) {
    return error_response("INVALID_INPUT", "Both 'from' and 'to' query params are required", 400);
  }

  const from = parse_positive_int(from_str);
  const to = parse_positive_int(to_str);

  if (from === null) {
    return error_response("INVALID_INPUT", `Expected a positive integer for 'from', got '${from_str}'`, 400, "from");
  }
  if (to === null) {
    return error_response("INVALID_INPUT", `Expected a positive integer for 'to', got '${to_str}'`, 400, "to");
  }
  if (from > to) {
    return error_response("INVALID_INPUT", "'from' must be less than or equal to 'to'", 400);
  }
  if (to - from + 1 > MAX_RANGE) {
    return error_response("RANGE_TOO_LARGE", `Range exceeds maximum of ${MAX_RANGE}`, 400);
  }

  const results = fizzbuzz_range(from, to);
  return json_response({ results, count: results.length });
}

export function create_server(port: number) {
  return Bun.serve({
    port,
    fetch(req) {
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

      return error_response("NOT_FOUND", "Route not found", 404);
    },
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT) || 3000;
  const server = create_server(port);
  console.log(`fizzbuzz-api listening on http://localhost:${server.port}`);
}
