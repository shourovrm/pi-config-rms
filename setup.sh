#!/usr/bin/env bash
set -euo pipefail

# ── pi-config-rms: one-command setup ──────────────────────────────────────
# Usage: ./setup.sh
#
# What it does:
#   1. Detects this repo's absolute path
#   2. Backs up existing ~/.pi/agent/settings.json (if any)
#   3. Copies pi-settings.example.json → ~/.pi/agent/settings.json
#   4. Replaces the self-referencing package entry with the local path
#   5. Runs pi update --extensions to install all external packages
#
# Prerequisites: pi must already be installed on the system.
# Internet connection required for step 5.
# ────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup]${NC} $*"; }
error() { echo -e "${RED}[setup]${NC} $*"; }

# ── 0. Prerequisite check ──────────────────────────────────────────────────

if ! command -v pi &>/dev/null; then
    error "pi not found on PATH. Install pi first:"
    error "  npm install -g @earendil-works/pi-coding-agent"
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

if [ -n "${PI_SETTINGS_DIR:-}" ]; then
    PI_SETTINGS_DIR="${PI_SETTINGS_DIR}"
elif [ -n "${XDG_CONFIG_HOME:-}" ]; then
    PI_SETTINGS_DIR="${XDG_CONFIG_HOME}/pi/agent"
else
    PI_SETTINGS_DIR="${HOME}/.pi/agent"
fi

mkdir -p "${PI_SETTINGS_DIR}"
DEST="${PI_SETTINGS_DIR}/settings.json"

# ── 3. Backup existing settings ────────────────────────────────────────────

if [ -f "${DEST}" ]; then
    BACKUP="${DEST}.backup-$(date +%Y%m%d-%H%M%S)"
    cp "${DEST}" "${BACKUP}"
    warn "Existing settings backed up to: ${BACKUP}"
fi

# ── 4. Copy settings and replace self-reference with local path ────────────

SELF_PACKAGE="git:github.com/shourovrm/pi-config-rms"

# Use sed with a delimiter that won't clash with the path (/ → #)
# Escape the repo path for sed (replace / with \/)
LOCAL_PATH="$(echo "${REPO_ROOT}" | sed 's/\//\\\//g')"
SELF_ESCAPED="$(echo "${SELF_PACKAGE}" | sed 's/\//\\\//g')"

sed "s#${SELF_PACKAGE}#${REPO_ROOT}#" "${SETTINGS_EXAMPLE}" > "${DEST}"
info "Settings written to: ${DEST}"

# ── 5. Install all external packages ────────────────────────────────────────

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
echo ""
info "To revert to your old settings:"
info "  cp ${BACKUP:-"<no backup>"} ${DEST}"
