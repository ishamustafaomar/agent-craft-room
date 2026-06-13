# Stages 6–9 — Deepen the Agent Using Dyad as Reference

Goal: bring our web platform's agent layer up to Dyad's fidelity, adapting (not copying) its prompts, tools, modes, compaction, and project-rules flow to our TanStack Start + WebContainer architecture. Built in sequence; each stage ships and is verified before the next.

---

## Stage 6 — Upgrade Agent Prompts & Tool Set

Replace our short paraphrased system prompt with a structured, Dyad-style prompt assembled from reusable blocks (role, general guidelines, tool-calling rules, file-editing tool-selection table, development workflow, coding guidelines). Adapt all wording for the web/WebContainer reality (no Electron, no `<dyad-command>` rebuild/restart — instead reference our preview Start/Restart controls).

New tools added to `src/lib/agent/tools.ts` and `tool-executor.ts`, executed client-side against the existing `Runtime`:
- `grep` — regex/substring search across the virtual FS, returns matching `path:line` snippets.
- `code_search` — filename + content keyword search (lightweight ranking; no embeddings).
- `rename_file` — move/rename in DB + WebContainer (we currently fake this with write+delete).
- `add_dependency` — add a package to `package.json` dependencies and queue an install in the container.
- `update_todos` — set a structured todo list for the turn (rendered in chat).
- Rename `edit_file` semantics to match Dyad's `search_replace` guidance (keep the tool name, sharpen the description + the file-editing tool-selection table in the prompt).

`run_command` keeps a guardrail list (reuse the spirit of `shell_handler.ts`: allow-list safe operations, block destructive ones).

UI: render `update_todos` as a checklist in the chat panel; keep tool activity rendering for the new tools.

Verify: build passes; a prompt triggers grep/read before writing; todos render.

---

## Stage 7 — Agent Modes: Build / Ask / Plan

Add a mode selector in the workspace header (segmented control), persisted per project in `localStorage` (same pattern as the model picker).

- **Build** (default): current behavior with the Stage 6 prompt + full tools.
- **Ask** (read-only): port `LOCAL_AGENT_ASK_SYSTEM_PROMPT`. Server passes only read tools (`read_file`, `list_files`, `grep`, `code_search`, `set_chat_summary`); write/delete/command tools are withheld so the model cannot mutate.
- **Plan**: port `PLAN_MODE_SYSTEM_PROMPT`. Read-only tools plus a `write_plan` tool (renders a plan card in chat) and `exit_plan` (switches the project to Build mode and seeds the next turn). No file writes.

`src/lib/agent/system-prompt.ts` becomes a builder that selects the base prompt by mode and injects project context + AI_RULES (Stage 9). `src/routes/api/chat.ts` accepts a validated `mode` field and chooses the system prompt + the allowed tool subset accordingly (server-enforced, not just UI).

Verify: Ask mode refuses to edit and offers explanation; Plan mode produces a plan card and `exit_plan` flips to Build.

---

## Stage 8 — Smart Chat Compaction & Summarization

Replace the naive "keep last 40 messages" with Dyad's two-prompt approach, adapted to run through the Lovable AI Gateway:
- **Compaction**: when history exceeds a token/length threshold, summarize older turns server-side using an adapted `COMPACTION_SYSTEM_PROMPT` (structured: Key Decisions / Code Changes / Current Task State / Active Plan / Important Context). Older messages are collapsed into one synthetic summary message prepended to the recent window, so detail is preserved instead of dropped.
- **Chat title summarization**: adapt `SUMMARIZE_CHAT_SYSTEM_PROMPT` to keep the project/chat title fresh; reuse the existing `set_chat_summary` path and `updateChatSummary` persistence.

Compaction runs inside the chat route before `streamText`, cached so we don't re-summarize identical history every turn.

Verify: a long conversation still answers coherently; the synthetic summary appears in the model input (logged), not in the visible transcript.

---

## Stage 9 — AI_RULES + App Blueprint Flow

**AI_RULES**: a per-project persistent guidance file stored as a row (e.g. `projects.ai_rules` text column via migration, with GRANTs) and surfaced as an editable `AI_RULES.md` in the file tree. Its contents are injected into every system prompt (`[[AI_RULES]]` slot) across all three modes. Adapt Dyad's `DEFAULT_AI_RULES` to our stack (Vite + React + TS + Tailwind + shadcn, our routing). The agent edits it only when the user asks to remember a convention.

**App Blueprint**: for new-app creation (dashboard "describe your app" flow), add an optional lightweight blueprint step adapted from `APP_BLUEPRINT_BLOCK`:
1. A `planning_questionnaire`-style step (reuse our questions UX) for 1–3 design questions.
2. A `write_app_blueprint` tool that returns a blueprint card (app name, design direction, primary color, asset prompts) for the user to approve before implementation begins.
On approval, the agent proceeds to build using the blueprint. Keep it skippable so power users can go straight to building.

Verify: editing AI_RULES.md changes agent behavior on the next turn; new-app flow shows a blueprint card and only builds after approval.

---

## Technical Notes
- All prompts live in `src/lib/agent/` as composable blocks mirroring Dyad's structure, reworded for web. No Electron/IPC/`<dyad-*>` tags; map Dyad's app-commands to our preview controls.
- New tools follow the existing client-executed pattern (declared server-side without `execute`, run in the browser via `tool-executor.ts` against `Runtime`). Mode-gating of tools is enforced server-side in `src/routes/api/chat.ts`.
- One DB migration in Stage 9 (`ai_rules` column) with proper GRANTs and RLS already covering the `projects` table.
- Each stage is independently verifiable; I'll confirm the build and key behaviors before moving on.

## Risks / Trade-offs
- Server-side compaction spends extra AI credits per long turn; threshold-gated and cached to minimize cost.
- `code_search` is keyword-based (no embeddings) to stay fully in-browser/edge — good enough for project-sized trees.
- Blueprint adds a step to new-app creation; kept optional to avoid slowing down simple prompts.
