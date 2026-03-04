#!/usr/bin/env bash
#
# bny installer
#
# usage:
#   # from source (in a cloned repo)
#   ./install.sh
#
#   # into any git repo (downloads source, builds locally)
#   curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash
#
# what it does:
#   1. ensures bun is installed
#   2. clones/updates bunny source into ./bny/
#   3. builds bin/bny from source (bun build --compile)
#   4. runs bny init if not already initialized
#

set -e

INSTALL_DIR="./bin"
SKIP_INIT=false
REPO="ahoward/bunny"
BRANCH="main"

# -- parse args --

while [ $# -gt 0 ]; do
  case "$1" in
    --dir)       INSTALL_DIR="$2"; shift 2 ;;
    --branch)    BRANCH="$2"; shift 2 ;;
    --skip-init) SKIP_INIT=true; shift ;;
    --help)
      echo "usage: install.sh [--dir DIR] [--branch BRANCH] [--skip-init]"
      echo ""
      echo "flags:"
      echo "  --dir DIR        install directory (default: ./bin)"
      echo "  --branch BRANCH  git branch to use (default: main)"
      echo "  --skip-init      don't run bny init after install"
      exit 0
      ;;
    *) echo "unknown option: $1"; exit 1 ;;
  esac
done

echo "[bny install]"
echo ""

# -- check bun --

if ! command -v bun &> /dev/null; then
  echo "error: bun is required but not found"
  echo "install: https://bun.sh"
  exit 1
fi

echo "  bun:      $(bun --version)"

# -- get source --

if [ -f "bin/bny.ts" ] && [ -d "bny/" ]; then
  # already in the bunny source repo
  echo "  source:   local (bunny repo detected)"
  BUNNY_ROOT="."
else
  # clone or update
  if [ -d "bny/.git" ]; then
    echo "  source:   updating bny/"
    git -C bny pull --ff-only origin "$BRANCH" 2>/dev/null || true
  else
    echo "  source:   cloning bny/"
    git clone --depth 1 --branch "$BRANCH" "https://github.com/$REPO.git" bny-src-tmp
    # move just what we need
    mkdir -p bny
    cp -R bny-src-tmp/bny/* bny/ 2>/dev/null || true
    cp -R bny-src-tmp/bin bny-src-tmp/src bny-src-tmp/package.json bny-src-tmp/tsconfig.json . 2>/dev/null || true
    rm -rf bny-src-tmp
  fi
  BUNNY_ROOT="."
fi

# -- install deps --

echo "  deps:     installing..."
(cd "$BUNNY_ROOT" && bun install --silent 2>/dev/null || bun install 2>/dev/null || true)

# -- build binary --

echo "  building: bin/bny"
mkdir -p "$INSTALL_DIR"
(cd "$BUNNY_ROOT" && bun build --compile bin/bny.ts --outfile "$INSTALL_DIR/bny" 2>&1) || {
  echo "error: build failed"
  exit 1
}
echo "  installed: $INSTALL_DIR/bny"

# -- verify --

if "$INSTALL_DIR/bny" init --help > /dev/null 2>&1; then
  echo "  verified:  ok"
else
  echo "  warning: binary may not work on this platform"
fi

# -- init --

if [ "$SKIP_INIT" = false ]; then
  echo ""
  echo "  running bny init..."
  "$INSTALL_DIR/bny" init
fi

echo ""
echo "done. add to PATH: export PATH=\"$INSTALL_DIR:\$PATH\""
