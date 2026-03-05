// src/lib/project.ts — project type detection
//
// detects project language/framework from filesystem markers.
// used by init, challenge, test-gen, verify.

import { existsSync } from "node:fs"
import { resolve } from "node:path"

export interface ProjectType {
  type:           string
  install_cmd:    string
  test_cmd:       string
  test_dir:       string   // "tests/", "spec/", "test/", "*_test.go"
  test_framework: string   // "bun:test", "pytest", "rspec", "cargo test", etc.
  property_lib:   string   // "fast-check", "hypothesis", "proptest", etc.
}

export function detect_project_type(root: string): ProjectType {
  if (existsSync(resolve(root, "bun.lock")) || existsSync(resolve(root, "bunfig.toml"))) {
    return {
      type: "bun", install_cmd: "bun install", test_cmd: "bun test",
      test_dir: "tests/", test_framework: "bun:test", property_lib: "fast-check",
    }
  }
  if (existsSync(resolve(root, "package.json"))) {
    return {
      type: "node", install_cmd: "npm install", test_cmd: "npm test",
      test_dir: "tests/", test_framework: "jest", property_lib: "fast-check",
    }
  }
  if (existsSync(resolve(root, "Cargo.toml"))) {
    return {
      type: "rust", install_cmd: "cargo build", test_cmd: "cargo test",
      test_dir: "tests/", test_framework: "cargo test", property_lib: "proptest",
    }
  }
  if (existsSync(resolve(root, "go.mod"))) {
    return {
      type: "go", install_cmd: "go mod download", test_cmd: "go test ./...",
      test_dir: "./", test_framework: "testing", property_lib: "rapid",
    }
  }
  if (existsSync(resolve(root, "pyproject.toml")) || existsSync(resolve(root, "setup.py"))) {
    return {
      type: "python", install_cmd: "pip install -e .", test_cmd: "pytest",
      test_dir: "tests/", test_framework: "pytest", property_lib: "hypothesis",
    }
  }
  if (existsSync(resolve(root, "Gemfile"))) {
    return {
      type: "ruby", install_cmd: "bundle install", test_cmd: "bundle exec rspec",
      test_dir: "spec/", test_framework: "rspec", property_lib: "rantly",
    }
  }
  if (existsSync(resolve(root, "Makefile"))) {
    return {
      type: "make", install_cmd: "make setup", test_cmd: "make test",
      test_dir: "tests/", test_framework: "make test", property_lib: "",
    }
  }
  return {
    type: "generic", install_cmd: "echo 'no install step configured'", test_cmd: "echo 'no test step configured'",
    test_dir: "tests/", test_framework: "unknown", property_lib: "",
  }
}
