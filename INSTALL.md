# pi-config-rms

Personal pi configuration — extensions, skills, agents, and settings.

## Install

```bash
git clone https://github.com/shourovrm/pi-config-rms.git
cd pi-config-rms
./setup.sh
```

**Prerequisites:** [Node.js](https://nodejs.org) (npm) and [pi](https://github.com/earendil-works/pi-coding-agent) (`npm install -g @earendil-works/pi-coding-agent`).

## What setup.sh does

1. Backs up existing `~/.pi/agent/settings.json` (if present)
2. Runs `npm install` to install extension dependencies (better-sqlite3, turndown, jsdom, etc.)
3. Copies `pi-settings.example.json` → `~/.pi/agent/settings.json`, replacing the self-referencing package entry with the local clone path
4. Runs `pi update --extensions` to install all external packages

## Contents

| Directory | Purpose |
|-----------|---------|
| `extensions/` | Custom extensions (tools, commands, event hooks) |
| `agents/` | Subagent definitions |
| `skills/` | Bundled skills |

## Update

```bash
git pull && ./setup.sh
```
