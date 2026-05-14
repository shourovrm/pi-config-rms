#!/usr/bin/env bash
set -euo pipefail

# ── pi-config-rms: one-command setup ──────────────────────────────────────
# Usage: ./setup.sh
#
# What it does:
#   1. Detects this repo's absolute path
#   2. Backs up existing ~/.pi/agent/settings.json (if any)
#   3. Runs npm install to install extension dependencies (better-sqlite3, etc.)
#   4. Copies pi-settings.example.json → ~/.pi/agent/settings.json
#   5. Replaces the self-referencing package entry with the local path
#   6. Runs pi update --extensions to install all external packages
#
# Prerequisites: Node.js (npm) and pi must be installed.
# Internet connection required for steps 3 and 6.
# ────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup]${NC} $*"; }
error() { echo -e "${RED}[setup]${NC} $*"; }

# ── 0. Prerequisite checks ────────────────────────────────────────────

if ! command -v pi &>/dev/null; then
    error "pi not found on PATH. Install pi first:"
    error "  npm install -g @earendil-works/pi-coding-agent"
    exit 1
fi

if ! command -v npm &>/dev/null; then
    error "npm not found on PATH. Install Node.js first:"
    error "  https://nodejs.org"
    exit 1
fi

# ── 1. Detect repo root ────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
info "Repo root: ${REPO_ROOT}"

SETTINGS_EXAMPLE="${REPO_ROOT}/pi-settings.example.json"
if [ ! -f "${SETTINGS_EXAMPLE}" ]; then
    error "pi-settings.example.json not found at ${SETTINGS_EXAMPLE}"
    exit 1
fi

# ── 2. Determine settings destination ──────────────────────────────────────

PI_CONF_DIR="${PI_SETTINGS_DIR:-${XDG_CONFIG_HOME:-${HOME}}/.pi/agent}"
mkdir -p "${PI_CONF_DIR}"
DEST="${PI_CONF_DIR}/settings.json"

# ── 3. Backup existing settings ────────────────────────────────────────────

if [ -f "${DEST}" ]; then
    BACKUP="${DEST}.backup-$(date +%Y%m%d-%H%M%S)"
    cp "${DEST}" "${BACKUP}"
    warn "Existing settings backed up to: ${BACKUP}"
fi

# ── 4. Install extension dependencies ─────────────────────────────────

info "Installing extension dependencies (npm install)..."
cd "${REPO_ROOT}"
if npm install --omit=dev; then
    info "Dependencies installed."
else
    error "npm install failed. Check output above."
    exit 1
fi

# ── 5. Copy settings, replacing self-reference with local path ─────────────

sed "s#git:github.com/shourovrm/pi-config-rms#${REPO_ROOT}#" \
    "${SETTINGS_EXAMPLE}" > "${DEST}"
info "Settings written to: ${DEST}"

# ── 6. Install all external pi packages ────────────────────────────────

info "Installing external packages (pi update --extensions)..."
if pi update --extensions; then
    info "All packages installed successfully."
else
    error "pi update --extensions failed. Check output above."
    error "You can re-run it manually: pi update --extensions"
    exit 1
fi

# ── Done ────────────────────────────────────────────────────────────────────

echo ""
info "Setup complete! Start a new pi session:"
info "  pi"
if [ -n "${BACKUP:-}" ]; then
    echo ""
    info "To revert to your old settings:"
    info "  cp ${BACKUP} ${DEST}"
fi
