#!/usr/bin/env bash
#
# bny installer
#
# usage:
#   curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/ahoward/bunny/main/install.sh | bash -s -- --dir /usr/local/bin
#
# what it does:
#   1. detects platform (darwin-arm64, darwin-x64, linux-x64)
#   2. tries to download pre-built binary from github releases (fast path)
#   3. falls back to building from source if no release exists
#   4. runs bny init if not already initialized
#

set -e

VERSION="${BNY_VERSION:-latest}"
INSTALL_DIR="./bin"
SKIP_INIT=false
REPO="ahoward/bunny"

# -- parse args --

while [ $# -gt 0 ]; do
  case "$1" in
    --dir)       INSTALL_DIR="$2"; shift 2 ;;
    --version)   VERSION="$2"; shift 2 ;;
    --skip-init) SKIP_INIT=true; shift ;;
    --help)
      echo "usage: install.sh [--dir DIR] [--version VERSION] [--skip-init]"
      echo ""
      echo "flags:"
      echo "  --dir DIR        install directory (default: ./bin)"
      echo "  --version VER    version to install (default: latest)"
      echo "  --skip-init      don't run bny init after install"
      exit 0
      ;;
    *) echo "unknown option: $1"; exit 1 ;;
  esac
done

# -- detect platform --

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64)        ARCH="x64" ;;
  *)
    echo "error: unsupported architecture: $ARCH"
    exit 1
    ;;
esac

PLATFORM="${OS}-${ARCH}"

case "$PLATFORM" in
  darwin-arm64|darwin-x64|linux-x64)
    ;;
  *)
    echo "error: unsupported platform: $PLATFORM"
    echo "supported: darwin-arm64, darwin-x64, linux-x64"
    exit 1
    ;;
esac

echo "[bny install]"
echo "  platform: $PLATFORM"
echo "  version:  $VERSION"
echo "  dir:      $INSTALL_DIR"
echo ""

mkdir -p "$INSTALL_DIR"
DEST="${INSTALL_DIR}/bny"
INSTALLED=false

# -- fast path: download pre-built binary --

try_download() {
  # resolve version
  local ver="$VERSION"
  if [ "$ver" = "latest" ]; then
    ver=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
    if [ -z "$ver" ]; then
      return 1
    fi
    echo "  resolved: $ver"
  fi

  local url="https://github.com/$REPO/releases/download/${ver}/bny-${PLATFORM}"
  echo "  trying:   $url"

  if command -v curl &> /dev/null; then
    curl -fsSL "$url" -o "$DEST" 2>/dev/null || return 1
  elif command -v wget &> /dev/null; then
    wget -q "$url" -O "$DEST" 2>/dev/null || return 1
  else
    return 1
  fi

  chmod +x "$DEST"
  echo "  download: ok"
  return 0
}

if try_download; then
  INSTALLED=true
else
  echo "  download: no release found, building from source..."
fi

# -- slow path: build from source --

if [ "$INSTALLED" = false ]; then
  if ! command -v bun &> /dev/null; then
    echo "error: no pre-built binary available and bun is not installed"
    echo "either:"
    echo "  1. install bun (https://bun.sh) and re-run"
    echo "  2. wait for a release with pre-built binaries"
    exit 1
  fi

  echo "  bun:      $(bun --version)"

  # get source if needed
  if [ -f "bin/bny.ts" ] && [ -d "src/" ]; then
    echo "  source:   local repo"
  else
    echo "  source:   cloning..."
    git clone --depth 1 "https://github.com/$REPO.git" bny-src-tmp
    cp -R bny-src-tmp/bny bny-src-tmp/bin bny-src-tmp/src bny-src-tmp/package.json bny-src-tmp/tsconfig.json . 2>/dev/null || true
    rm -rf bny-src-tmp
  fi

  bun install --silent 2>/dev/null || bun install 2>/dev/null || true

  echo "  building: bin/bny"
  bun build --compile bin/bny.ts --outfile "$DEST" 2>&1 || {
    echo "error: build failed"
    exit 1
  }
  INSTALLED=true
fi

# -- verify --

echo "  installed: $DEST"

if "$DEST" init --help > /dev/null 2>&1; then
  echo "  verified:  ok"
else
  echo "  warning: binary may not work on this platform"
fi

# -- init --

if [ "$SKIP_INIT" = false ] && [ ! -d "bny" ]; then
  echo ""
  echo "  running bny init..."
  "$DEST" init
fi

echo ""
echo "done. add to PATH: export PATH=\"$INSTALL_DIR:\$PATH\""
