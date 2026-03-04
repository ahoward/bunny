import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

let tmp_dir: string;
let sample_file: string;
let empty_file: string;

beforeAll(async () => {
  tmp_dir = await mkdtemp(join(tmpdir(), "wc-test-"));
  sample_file = join(tmp_dir, "sample.txt");
  empty_file = join(tmp_dir, "empty.txt");
  await writeFile(sample_file, "hello world\nfoo bar baz\n");
  await writeFile(empty_file, "");
});

afterAll(async () => {
  await rm(tmp_dir, { recursive: true });
});

const run_cli = async (args: string[]) => {
  const entry = join(import.meta.dir, "..", "bin", "wc.ts");
  const proc = Bun.spawn(["bun", "run", entry, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exit_code = await proc.exited;
  return { stdout, stderr, exit_code };
};

describe("CLI", () => {
  test("prints counts for a file in columnar format", async () => {
    const { stdout, exit_code } = await run_cli([sample_file]);
    expect(exit_code).toBe(0);
    // format: lines words chars filename
    expect(stdout.trim()).toMatch(/^\s*2\s+5\s+24\s+/);
  });

  test("prints JSON with --json flag", async () => {
    const { stdout, exit_code } = await run_cli(["--json", sample_file]);
    expect(exit_code).toBe(0);
    const result = JSON.parse(stdout.trim());
    expect(result.lines).toBe(2);
    expect(result.words).toBe(5);
    expect(result.chars).toBe(24);
  });

  test("handles empty file", async () => {
    const { stdout, exit_code } = await run_cli([empty_file]);
    expect(exit_code).toBe(0);
    expect(stdout.trim()).toMatch(/^\s*0\s+0\s+0\s+/);
  });

  test("errors on missing file", async () => {
    const { stderr, exit_code } = await run_cli(["/nonexistent/file.txt"]);
    expect(exit_code).toBe(1);
    expect(stderr.length).toBeGreaterThan(0);
  });

  test("shows only words with --words flag", async () => {
    const { stdout, exit_code } = await run_cli(["--words", sample_file]);
    expect(exit_code).toBe(0);
    expect(stdout.trim()).toMatch(/^\s*5\s+/);
  });

  test("shows only lines with --lines flag", async () => {
    const { stdout, exit_code } = await run_cli(["--lines", sample_file]);
    expect(exit_code).toBe(0);
    expect(stdout.trim()).toMatch(/^\s*2\s+/);
  });

  test("shows only chars with --chars flag", async () => {
    const { stdout, exit_code } = await run_cli(["--chars", sample_file]);
    expect(exit_code).toBe(0);
    expect(stdout.trim()).toMatch(/^\s*24\s+/);
  });
});
