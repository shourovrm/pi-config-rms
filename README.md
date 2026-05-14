# pi-config-rms

Personal pi coding agent configuration — agents, extensions, skills, prompts, and workflow rules.

## Install

```bash
git clone https://github.com/shourovrm/pi-config-rms.git
cd pi-config-rms
./setup.sh
```

**Prerequisites:** [Node.js](https://nodejs.org) (npm) and [pi](https://github.com/earendil-works/pi-coding-agent) (`npm install -g @earendil-works/pi-coding-agent`).

`setup.sh` installs npm dependencies, copies settings, and fetches all external pi packages.
See [INSTALL.md](INSTALL.md) for details.

## Quick Start: Using Agents

Agents are subagent role-cards. Use them via the `subagent` tool:

```
"Use the planner agent to create an implementation plan for this feature."
"Use the researcher to find the latest docs on X."
"Run the full-workflow chain to scout, plan, implement, and review this task."
```

Chain workflows orchestrate multiple agents in sequence:
- `full-workflow` — scout → plan → review plan → implement → review
- `scout-and-plan` — scout → plan → review plan
- `implement-plan` — implement a pre-made plan → review
- `quick-plan` — fast scout → plan (no review)

## Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| `scout` | deepseek-v4-pro | Fast codebase recon — finds files, patterns, architecture |
| `researcher` | deepseek-v4-pro | Web research — searches, evaluates, synthesizes source-backed briefs |
| `worker` | glm-5.1 | General-purpose implementation from scoped tasks |
| `planner` | glm-5.1 (xhigh) | Creates implementation plans from context and requirements |
| `plan-reviewer` | qwen3.6-plus (xhigh) | Critiques plans for flaws, gaps, and bad assumptions |
| `reviewer` | glm-5.1 (xhigh) | Code review — quality, security, makes small follow-up fixes |
| `context-builder` | deepseek-v4-pro | Analyzes requirements + codebase, builds meta-prompt for planner |
| `multimodal` | kimi-k2.6 | Reads PDFs, images, and other media for details |

## Extensions

### Tools

| Extension | Description |
|-----------|-------------|
| `web-search` | Search the web and return structured results |
| `web-fetch` | Fetch and extract readable content from URLs |
| `youtube-search` | Search YouTube for videos |
| `video-extract` | Extract frames and content from YouTube/local video |
| `google-image-search` | Search Google Images via Custom Search API |
| `ask-user-question` | Structured multi-choice questions to the user |
| `copy-to-clipboard` | Copy text to system clipboard via OSC52 |
| `subagents` | Spawn subagents for scoped work (scout, researcher, worker) |
| `filechanges` | Tracks files modified/created by edit and write tools |
| `md-link` | Markdown link handling and resolution |
| `memory` | Persistent project memory storage |
| `oracle` | Get a second opinion from another AI model |

### Commands & UI

| Extension | Description |
|-----------|-------------|
| `prompt-history` | Ctrl-R style prompt history search across pi sessions |
| `handoff` | Transfer session context to a new focused session |
| `notify` | Desktop notifications for long-running tasks |
| `status-line` | Custom status line in the pi TUI |
| `speedreading` | RSVP (Rapid Serial Visual Presentation) reader |
| `explanatory-output-style` | Explanatory output formatting for model responses |
| `context` | Visualize current context usage as a colored grid overlay |
| `custom-header` | Custom headers in pi sessions |

## Skills

| Skill | Description |
|-------|-------------|
| `docx` | Create, edit, read Word documents (tracked changes, comments, images) |
| `pdf` | Create, merge, split, fill forms, OCR, watermarks, encrypt/decrypt PDFs |
| `pptx` | Create, edit, read PowerPoint presentations |
| `xlsx` | Create, edit, read Excel spreadsheets with formatting and formulas |
| `brave-search` | Web search and content extraction via Brave Search API |
| `reddit` | Search Reddit and browse subreddit posts via public JSON API |
| `stop-slop` | Remove AI writing patterns from prose |
| `orchestrator` | Session orchestration rules — subagent routing, context hygiene |
| `skill-creator` | Guide for creating new pi skills |

## Prompts

| Prompt | Description |
|--------|-------------|
| `sharpen-communication` | Sharpen model communication clarity and directness |

## Config Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Global agent instructions — git workflow, commit rules, delegation, quality gates |
| `APPEND_SYSTEM.md` | Main-agent delegation playbook — when/how to use subagents |
| `context.md` | Context management reference notes |

## System Dependencies

```bash
# docx (Word documents)
npm install -g docx
# Also requires: pandoc, LibreOffice, poppler-utils

# pdf (PDF processing)
pip install pypdf pdfplumber reportlab
# Also requires: qpdf, poppler-utils, tesseract (for OCR)

# pptx (PowerPoint)
npm install -g pptxgenjs
pip install "markitdown[pptx]" Pillow
# Also requires: LibreOffice, poppler-utils

# xlsx (Excel)
pip install openpyxl
```

## Update

```bash
git pull && ./setup.sh
```

## Contributing Changes Back

All config lives in this repo. After making changes, commit and push to share across machines.

### Extensions, agents, skills

Edit files directly in the repo directory, then:

```bash
git add -A
git commit -m "feat: describe your change"
git push
```

### Settings (model, theme, packages)

Your live settings are at `~/.pi/agent/settings.json`. Sync them to the repo template:

```bash
cp ~/.pi/agent/settings.json pi-settings.example.json
git add pi-settings.example.json
git commit -m "chore: sync settings"
git push
```

### On other machines

```bash
git pull && ./setup.sh
```

## Detailed Guide

See [GUIDE.md](GUIDE.md) for common workflows, agent usage patterns, and extension command reference.
