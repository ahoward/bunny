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
#   2. downloads the bny binary from github releases
#   3. places it at ./bin/bny (or specified --dir)
#   4. runs bny init if .bny/ doesn't exist
#

set -e

VERSION="${BNY_VERSION:-latest}"
INSTALL_DIR="./bin"
SKIP_INIT=false
REPO="ahoward/bunny"

# -- parse args --

while [ $# -gt 0 ]; do
  case "$1" in
    --dir)     INSTALL_DIR="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
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

# -- resolve version --

if [ "$VERSION" = "latest" ]; then
  VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
  if [ -z "$VERSION" ]; then
    echo "error: could not determine latest version"
    echo ""
    echo "no releases found yet. to build from source:"
    echo "  git clone https://github.com/$REPO.git"
    echo "  cd bunny"
    echo "  bun build --compile bin/bny.ts --outfile bny"
    exit 1
  fi
  echo "  resolved: $VERSION"
fi

# -- download --

BINARY_NAME="bny-${PLATFORM}"
URL="https://github.com/$REPO/releases/download/${VERSION}/${BINARY_NAME}"

echo "  downloading: $URL"

mkdir -p "$INSTALL_DIR"
DEST="${INSTALL_DIR}/bny"

if command -v curl &> /dev/null; then
  curl -fsSL "$URL" -o "$DEST"
elif command -v wget &> /dev/null; then
  wget -q "$URL" -O "$DEST"
else
  echo "error: neither curl nor wget found"
  exit 1
fi

chmod +x "$DEST"
echo "  installed:  $DEST"

# -- verify --

if "$DEST" status > /dev/null 2>&1 || "$DEST" init --help > /dev/null 2>&1; then
  echo "  verified:   ok"
else
  echo "  warning: binary may not work on this platform"
fi

# -- init --

if [ "$SKIP_INIT" = false ] && [ ! -d ".bny" ]; then
  echo ""
  echo "  running bny init..."
  "$DEST" init
fi

echo ""
echo "done. run '$DEST status' to verify."
