#!/usr/bin/env bun
import { run } from "../src/cli";

const exit_code = await run(process.argv.slice(2));
process.exit(exit_code);
