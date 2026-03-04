import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { create_server } from "../src/server";

let server: ReturnType<typeof Bun.serve>;
let base_url: string;

beforeAll(() => {
  server = create_server(0); // port 0 = random available port
  base_url = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.stop();
});

describe("GET /fizzbuzz/:n", () => {
  test("returns fizzbuzz result for valid input", async () => {
    const res = await fetch(`${base_url}/fizzbuzz/15`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    const body = await res.json();
    expect(body).toEqual({ number: 15, result: "fizzbuzz" });
  });

  test("returns fizz for 3", async () => {
    const res = await fetch(`${base_url}/fizzbuzz/3`);
    const body = await res.json();
    expect(body).toEqual({ number: 3, result: "fizz" });
  });

  test("returns buzz for 5", async () => {
    const res = await fetch(`${base_url}/fizzbuzz/5`);
    const body = await res.json();
    expect(body).toEqual({ number: 5, result: "buzz" });
  });

  test("returns number as string for 7", async () => {
    const res = await fetch(`${base_url}/fizzbuzz/7`);
    const body = await res.json();
    expect(body).toEqual({ number: 7, result: "7" });
  });

  test("returns 400 for non-numeric input", async () => {
    const res = await fetch(`${base_url}/fizzbuzz/abc`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(body.error.param).toBe("n");
  });

  test("returns 400 for zero", async () => {
    const res = await fetch(`${base_url}/fizzbuzz/0`);
    expect(res.status).toBe(400);
  });

  test("returns 400 for negative number", async () => {
    const res = await fetch(`${base_url}/fizzbuzz/-3`);
    expect(res.status).toBe(400);
  });

  test("returns 400 for float", async () => {
    const res = await fetch(`${base_url}/fizzbuzz/3.7`);
    expect(res.status).toBe(400);
  });
});

describe("GET /fizzbuzz?from=&to=", () => {
  test("returns range results", async () => {
    const res = await fetch(`${base_url}/fizzbuzz?from=1&to=5`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(5);
    expect(body.results).toHaveLength(5);
    expect(body.results[0]).toEqual({ number: 1, result: "1" });
    expect(body.results[2]).toEqual({ number: 3, result: "fizz" });
    expect(body.results[4]).toEqual({ number: 5, result: "buzz" });
  });

  test("returns 400 when from > to", async () => {
    const res = await fetch(`${base_url}/fizzbuzz?from=10&to=5`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  test("returns 400 when range exceeds 1000", async () => {
    const res = await fetch(`${base_url}/fizzbuzz?from=1&to=1001`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("RANGE_TOO_LARGE");
  });

  test("returns 400 for non-numeric from", async () => {
    const res = await fetch(`${base_url}/fizzbuzz?from=abc&to=5`);
    expect(res.status).toBe(400);
  });

  test("returns 400 for missing params", async () => {
    const res = await fetch(`${base_url}/fizzbuzz?from=1`);
    expect(res.status).toBe(400);
  });
});

describe("GET /health", () => {
  test("returns ok", async () => {
    const res = await fetch(`${base_url}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});

describe("unknown routes", () => {
  test("returns 404 for unknown path", async () => {
    const res = await fetch(`${base_url}/unknown`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  test("returns 404 for root", async () => {
    const res = await fetch(`${base_url}/`);
    expect(res.status).toBe(404);
  });
});
