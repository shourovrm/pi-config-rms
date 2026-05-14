# pi-config-rms

Personal pi coding agent configuration — extensions, skills, agents, and settings.

## Install

```bash
git clone https://github.com/shourovrm/pi-config-rms.git
cd pi-config-rms
./setup.sh
```

**Prerequisites:** [pi](https://github.com/earendil-works/pi-coding-agent) must be installed (`npm install -g @earendil-works/pi-coding-agent`).

## What setup.sh does

1. Backs up existing `~/.pi/agent/settings.json` (if any)
2. Installs `pi-settings.example.json` as your pi settings
3. Installs all external pi packages (extensions, skills) via `pi update --extensions`
4. Ready to run `pi`

## Contents

| Directory | Purpose |
|-----------|---------|
| `extensions/` | Custom pi extensions (tools, commands, event hooks) |
| `agents/` | Custom subagent definitions |
| `skills/` | Bundled skills (skill-creator, pptx) |

## Update

```bash
git pull
./setup.sh
```
