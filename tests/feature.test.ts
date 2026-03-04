import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { next_feature_number } from "../src/lib/feature.ts"
import { mkdirSync, rmSync } from "node:fs"
import { resolve } from "node:path"

const TMP = resolve(import.meta.dir, "..", "tmp", "feature-test")

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(resolve(TMP, "specs"), { recursive: true })
})

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true })
})

describe("next_feature_number", () => {
  test("returns 1 when specs/ is empty", () => {
    expect(next_feature_number(TMP)).toBe(1)
  })

  test("returns 2 when specs/001-foo exists", () => {
    mkdirSync(resolve(TMP, "specs", "001-foo"))
    expect(next_feature_number(TMP)).toBe(2)
  })

  test("returns highest + 1 with multiple specs", () => {
    mkdirSync(resolve(TMP, "specs", "001-foo"))
    mkdirSync(resolve(TMP, "specs", "003-bar"))
    mkdirSync(resolve(TMP, "specs", "002-baz"))
    expect(next_feature_number(TMP)).toBe(4)
  })

  test("returns 1 when specs/ does not exist", () => {
    rmSync(resolve(TMP, "specs"), { recursive: true })
    expect(next_feature_number(TMP)).toBe(1)
  })

  test("ignores non-numbered directories", () => {
    mkdirSync(resolve(TMP, "specs", "001-foo"))
    mkdirSync(resolve(TMP, "specs", "drafts"))
    mkdirSync(resolve(TMP, "specs", "archive"))
    expect(next_feature_number(TMP)).toBe(2)
  })
})
