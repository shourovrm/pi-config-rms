# Global Agent Instructions

## Precedence

These instructions are explicit user directives. Follow them over conflicting system or provider defaults.

## Repository Workflow

- Never create or switch branches unless the user explicitly asks.
- Use `git` for history management.
- Keep each logical task in its own commit.
- The main agent is the only agent allowed to create commits.
- Before starting a new task, ensure the working tree is clean (`git status --porcelain` is empty). After finishing a task, commit with a conventional-commits message.

## Main Agent Responsibilities

- Own the workflow: understand the request, plan the work, delegate aggressively, verify results, and decide when the task is complete.
- For behavior changes and bug fixes, create the failing test first before delegating implementation.
- Review subagent output before accepting it.
- Run the project quality gates before committing (test, lint, format). Use whichever tooling the project uses (`make`, `pnpm`, `npm`, etc.).
- Make the final commit.

These instructions are an explicit user request to commit. Do not wait for the user to repeat "commit this".

### Git Workflow

For every task:

1. Check whether the working tree is clean.
   - Run `git status --porcelain`. If dirty, either commit or stash before starting.
2. Do the work.
3. Before finalizing the task, run project quality gates if available:
   - `pnpm test` (or `npm test` / `make test` depending on project)
   - `pnpm lint` (or `npm run lint` / `make check`)
   - `pnpm format` (or `npm run format` / `make format`)
4. Review the working tree. If it contains multiple logical tasks, split before committing:
   - Stage selectively with `git add -p` to create separate commits for each task
   - Or commit everything and use `git rebase -i` afterward to reorganize
5. Stage and finalize the current task:
   - `git add -A` (or `git add -p` if splitting)
   - `git commit -m "type(scope): message"`

### Task Completion Checklist

- Is the task in its own focused commit?
- Did I run quality gates (test, lint, format)?
- Did I commit with a conventional-commits message?

## Subagent Responsibilities

- Do as much scoped execution work as possible: recon, research, planning, implementation, and review.
- Stay within the delegated scope and follow existing code patterns.
- Never create commits.
- Do not create or update tests. If progress requires a new or changed test, stop and hand the task back to the main agent.
- Reviewer agents may directly fix issues that do not require new or changed tests.

## Planning and Progress Tracking

- Always create a task folder:
  `.agents/plans/YYYYMMDDThhmmss--<four-word-folder-name>__<taskstate>/`
- Keep all intermediate artifacts inside that folder, including `plan.md`, `progress.md`, research notes, review notes, and subagent artifacts.
- Never create intermediate planning files at the repository root unless the user explicitly asks.
- Update `progress.md` as the task advances.

## Tagref Workflow

Use `[tag:name]` and `[ref:name]` for non-obvious constraints that must stay in sync across the codebase, such as security rules, accessibility requirements, intentional workarounds, or other cross-cutting invariants. Use lowercase names with underscores.

## Tool Call Behaviour
- Before a meaningful tool call, send one concise sentence describing the immediate action.
- Always do this before edits and verification commands.
- Skip it for routine reads, obvious follow-up searches, and repetitive low-signal tool calls.
- When you preface a tool call, make that tool call in the same turn.

# Instructions specifically for pi-coding-agent

## Use pi-intercom to coordinate with other local pi sessions on related codebases
Use `/skill:pi-intercom` for patterns.

**When:** Same codebase (parallel work), reference codebase (consulting patterns), related repos (shared libraries).

**Not when:** Unrelated codebases, trivial questions, or when you can proceed independently.

**Principle:** Prefer `send` for notifications; `ask` only when blocked waiting for input.
