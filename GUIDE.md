# pi-config-rms Guide

Common workflows, agent usage, extension commands, and tips.

## Agent Workflows

### Research → Plan → Implement

The full pipeline for implementing a feature:

```
1. "Use the researcher to find current best practices for [topic]"
2. "Use the scout to explore our codebase for [relevant area]"
3. "Use the context-builder to combine the research + codebase into a meta-prompt"
4. "Use the planner to create an implementation plan"
5. "Use the plan-reviewer to critique the plan"
6. "Use the worker to implement step 1 of the plan"
```

Or use a chain to automate steps:
```
"Run the full-workflow chain for: [task description]"
```

### Quick Scout

```
"Use the scout to find where authentication logic lives in this project"
"Use the scout to explore how tests are structured in this repo"
```

### Code Review

```
"Use the reviewer to check my latest changes for issues"
```

### PDF / Media Analysis

```
"Use the multimodal agent to read this PDF and extract key findings"
"Use the multimodal agent to describe what's in this image"
```

### Multi-Agent Parallel Work

```
"Use the worker to implement the API endpoint. In parallel, use the researcher to find error-handling best practices for Express."
```

---

## Extension Commands

### From the pi prompt (`/` commands)

| Command | What it does |
|---------|-------------|
| `/handoff <goal>` | Transfer current session context to a new session with an AI-generated prompt |
| `/oracle` | Get a second opinion from another model on your question |

### From the agent (tool calls)

The agent will use these tools automatically when appropriate:

| Tool | Trigger phrase examples |
|------|------------------------|
| `web_search` | "search for...", "look up...", "what does the docs say..." |
| `web_fetch` | "read this article...", "check that URL..." |
| `youtube_search` | "find a video about..." |
| `video_extract` | "summarize this video...", "what's shown at 2:30..." |
| `google_image_search` | "find images of..." |
| `ask_user_question` | Agent needs clarification — you'll see a TUI prompt |
| `copy_to_clipboard` | "copy this to clipboard" |
| `subagent` | Long/complex tasks delegated to scout/researcher/worker |

---

## Skills Usage

Skills are loaded automatically. The agent uses them when your request matches their trigger:

### Office Documents

```
"Read this DOCX and summarize the key points"
"Create a Word document with the report structure we discussed"
"Add tracked changes to this contract — replace '30 days' with '60 days'"
"Merge these three PDFs into one"
"Fill out this PDF form with the following data"
"Create a PowerPoint presentation with 5 slides about our Q3 results"
"Open this Excel file and fix the broken formulas in column D"
```

### Web & Research

```
"Search for the latest TypeScript 5.7 features"
"Find Reddit discussions about Bun vs Node.js"
"What's the best approach for React state management in 2025?"
```

### Code Quality

```
"Review this blog post draft and remove any AI-sounding language"
```

---

## Agent Chain Configuration

Chains are pre-defined subagent sequences. They live in `agents/` as `.chain.md` files.

### full-workflow
```
Scout → Plan → Review Plan → Implement → Review
```
Best for: Complete feature implementation from scratch.

### scout-and-plan
```
Scout → Plan → Review Plan
```
Best for: Understanding a codebase and creating a plan before implementation.

### implement-plan
```
Implement → Review
```
Best for: Executing a pre-existing plan.

### quick-plan
```
Scout → Plan
```
Best for: Fast turnaround when review isn't needed.

---

## Configuration Reference

### Adding a new model

Edit `~/.pi/agent/settings.json`:

```json
{
  "enabledModels": [
    "opencode-go/deepseek-v4-pro",
    "opencode-go/glm-5.1",
    "opencode-go/new-model-name"
  ]
}
```

Then run `/reload` in pi.

### Switching default model

```json
{
  "defaultModel": "opencode-go/new-model-name"
}
```

### Adding a new agent

1. Create a `.md` file in `agents/` with frontmatter:

```markdown
---
name: my-agent
model: opencode-go/deepseek-v4-pro
description: What this agent does
tools: read, write, bash, grep, find
---

You are a [role]. Given [task], do [process].

Output format:
[specify structure]
```

2. Push and run `pi update --extensions`.

### Adding a new skill

Use the `skill-creator` skill:

```
"Use the skill-creator to help me create a new skill for [purpose]"
```

---

## Troubleshooting

### Agents not showing up
Run `/reload` in pi, or restart pi. Check that `"agents": ["./agents"]` is in `package.json`.

### Extensions not loading
Run `pi update --extensions` to reinstall dependencies.

### Model not available
Check `~/.pi/agent/settings.json` — the model must be in `enabledModels` with the full `provider/model` prefix.

### Subagent model override not working
Model overrides in agent frontmatter require the subagent extension v2+. If the agent uses the `subagent` tool's default model, check your subagent extension version.
