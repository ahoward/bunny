import { describe, expect, test } from "bun:test";
import { route } from "../src/server";

function make_request(path: string): Request {
  return new Request(`http://localhost${path}`);
}

async function json_body(res: Response): Promise<unknown> {
  return res.json();
}

describe("GET /health", () => {
  test("returns ok", async () => {
    const res = route(make_request("/health"));
    expect(res.status).toBe(200);
    expect(await json_body(res)).toEqual({ status: "ok" });
  });
});

describe("GET /fizzbuzz/:number", () => {
  test("returns fizzbuzz for 15", async () => {
    const res = route(make_request("/fizzbuzz/15"));
    expect(res.status).toBe(200);
    expect(await json_body(res)).toEqual({ input: 15, result: "fizzbuzz" });
  });

  test("returns fizz for 3", async () => {
    const res = route(make_request("/fizzbuzz/3"));
    expect(res.status).toBe(200);
    expect(await json_body(res)).toEqual({ input: 3, result: "fizz" });
  });

  test("returns buzz for 5", async () => {
    const res = route(make_request("/fizzbuzz/5"));
    expect(res.status).toBe(200);
    expect(await json_body(res)).toEqual({ input: 5, result: "buzz" });
  });

  test("returns number as string for 7", async () => {
    const res = route(make_request("/fizzbuzz/7"));
    expect(res.status).toBe(200);
    expect(await json_body(res)).toEqual({ input: 7, result: "7" });
  });

  test("returns 400 for non-integer", async () => {
    const res = route(make_request("/fizzbuzz/3.7"));
    expect(res.status).toBe(400);
    const body = await json_body(res) as { error: string };
    expect(body.error).toBe("invalid_input");
  });

  test("returns 400 for negative number", async () => {
    const res = route(make_request("/fizzbuzz/-5"));
    expect(res.status).toBe(400);
  });

  test("returns 400 for non-numeric string", async () => {
    const res = route(make_request("/fizzbuzz/abc"));
    expect(res.status).toBe(400);
  });

  test("returns 400 for zero", async () => {
    const res = route(make_request("/fizzbuzz/0"));
    expect(res.status).toBe(400);
  });
});

describe("GET /fizzbuzz?from=&to=", () => {
  test("returns range results", async () => {
    const res = route(make_request("/fizzbuzz?from=1&to=5"));
    expect(res.status).toBe(200);
    const body = await json_body(res) as { from: number; to: number; results: unknown[] };
    expect(body.from).toBe(1);
    expect(body.to).toBe(5);
    expect(body.results).toHaveLength(5);
  });

  test("returns 400 when from is missing", async () => {
    const res = route(make_request("/fizzbuzz?to=5"));
    expect(res.status).toBe(400);
  });

  test("returns 400 when to is missing", async () => {
    const res = route(make_request("/fizzbuzz?from=1"));
    expect(res.status).toBe(400);
  });

  test("returns 400 when from > to", async () => {
    const res = route(make_request("/fizzbuzz?from=10&to=5"));
    expect(res.status).toBe(400);
  });

  test("returns 400 for range too large", async () => {
    const res = route(make_request("/fizzbuzz?from=1&to=1002"));
    expect(res.status).toBe(400);
    const body = await json_body(res) as { message: string };
    expect(body.message).toContain("Range too large");
  });
});

describe("unknown routes", () => {
  test("returns 404 for unknown path", async () => {
    const res = route(make_request("/unknown"));
    expect(res.status).toBe(404);
  });
});
