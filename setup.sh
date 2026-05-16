#!/usr/bin/env bash
set -euo pipefail

# ── pi-config-rms setup ────────────────────────────────────────────────────
# One command to install this package into ~/.pi/agent/
# Usage: ./setup.sh
#
# What it does:
#   1. Installs npm dependencies for the extensions in this repo
#   2. Copies pi-settings.example.json → ~/.pi/agent/settings.json
#      (replacing the self-referencing git entry with this clone's path)
#   3. Runs pi update --extensions to install all external packages
#
# Prerequisites: Node.js (npm) and pi
# ────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup]${NC} $*"; }
error() { echo -e "${RED}[setup]${NC} $*"; }

# ── Prerequisites ──────────────────────────────────────────────────────────

for cmd in pi npm; do
    if ! command -v "$cmd" &>/dev/null; then
        error "$cmd not found on PATH. Install it first."
        exit 1
    fi
done

# ── Paths ──────────────────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETTINGS_SRC="${REPO_ROOT}/pi-settings.example.json"

if [ ! -f "${SETTINGS_SRC}" ]; then
    error "pi-settings.example.json not found at ${SETTINGS_SRC}"
    exit 1
fi

# Always install to the default pi config location.
# If you set PI_CODING_AGENT_DIR to a custom path, unset it before running
# this script, or edit the PI_AGENT_DIR line below.
PI_AGENT_DIR="${HOME}/.pi/agent"

if [ -n "${PI_CODING_AGENT_DIR:-}" ] && [ "${PI_CODING_AGENT_DIR}" != "${PI_AGENT_DIR}" ]; then
    warn "PI_CODING_AGENT_DIR=${PI_CODING_AGENT_DIR}"
    warn "This script installs to the default location: ${PI_AGENT_DIR}"
    warn "Unset PI_CODING_AGENT_DIR if you want pi to use this config."
fi

mkdir -p "${PI_AGENT_DIR}"
DEST="${PI_AGENT_DIR}/settings.json"
info "Installing to: ${PI_AGENT_DIR}"

# ── Backup existing settings ───────────────────────────────────────────────

if [ -f "${DEST}" ]; then
    BACKUP="${DEST}.backup-$(date +%Y%m%d-%H%M%S)"
    cp "${DEST}" "${BACKUP}"
    warn "Existing settings backed up: ${BACKUP}"
fi

# ── Install extension dependencies ─────────────────────────────────────────

info "Installing extension dependencies..."
npm --prefix "${REPO_ROOT}" install --omit=dev
info "Dependencies installed."

# ── Write settings ─────────────────────────────────────────────────────────

info "Writing settings..."
sed "s#git:github.com/shourovrm/pi-config-rms#${REPO_ROOT}#" \
    "${SETTINGS_SRC}" > "${DEST}"
info "Settings written: ${DEST}"

# ── Install external packages ──────────────────────────────────────────────

info "Installing external packages (pi update --extensions)..."
# Override PI_CODING_AGENT_DIR so packages land in the same agent dir
PI_CODING_AGENT_DIR="${PI_AGENT_DIR}" pi update --extensions
info "All packages installed."

# ── Done ───────────────────────────────────────────────────────────────────

echo ""
info "Setup complete. Start pi:"
info "  pi"
echo ""
info "If you haven't authenticated with a provider yet:"
info "  Run pi and use /login, or copy your auth.json from a backup."
if [ -n "${BACKUP:-}" ]; then
    echo ""
    info "To restore your previous settings:"
    info "  cp ${BACKUP} ${DEST}"
fi
