import { describe, it, expect } from "bun:test";
import { resolve } from "path";

const bin = resolve(import.meta.dir, "../bin/wc-tool");
const fixtures = resolve(import.meta.dir, "fixtures");

async function run(args: string[], stdin?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", bin, ...args], {
    stdin: stdin !== undefined ? new Response(stdin).body : undefined,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

describe("CLI", () => {
  it("counts a single file", async () => {
    const { stdout, exitCode } = await run([`${fixtures}/multi-line.txt`]);
    expect(exitCode).toBe(0);
    // output format: lines words characters filename
    expect(stdout.trim()).toMatch(/^\s*2\s+9\s+44\s+/);
  });

  it("counts multiple files with total", async () => {
    const { stdout, exitCode } = await run([
      `${fixtures}/single-word.txt`,
      `${fixtures}/multi-line.txt`,
    ]);
    expect(exitCode).toBe(0);
    const lines = stdout.trim().split("\n");
    expect(lines.length).toBe(3); // two files + total
    expect(lines[2]).toMatch(/total$/);
  });

  it("reads from stdin when no files given", async () => {
    const { stdout, exitCode } = await run([], "hello world\n");
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\s*1\s+2\s+12/);
  });

  it("exits 1 for missing file", async () => {
    const { stderr, exitCode } = await run([`${fixtures}/nonexistent.txt`]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/nonexistent\.txt/);
  });

  it("handles empty file", async () => {
    const { stdout, exitCode } = await run([`${fixtures}/empty.txt`]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\s*0\s+0\s+0/);
  });
});
