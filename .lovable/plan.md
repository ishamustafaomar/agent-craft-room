# AI Vibe-Coding Platform — Staged Build Plan

A web-based AI coding agent inspired by Dyad/Lovable/Bolt/Cursor. We reconstruct the Electron IPC handlers into a clean web architecture: a streaming agent engine, a tool-calling execution layer, in-browser code execution via WebContainers, and a 3-panel IDE — all on the supported TanStack Start stack (not Electron/Next.js, but same App-Router-style server boundaries).

## Reality Check (important)
- The uploaded handlers use Electron's local Node.js, real filesystem, and `child_process`. A deployed web app runs on an edge runtime — it **cannot** spawn real terminals server-side.
- Per your choice, real `npm install` / dev server / terminal runs **in the browser via StackBlitz WebContainers**. The agent edits a virtual file system; the preview is a live dev server inside the browser.
- The server's job is: auth, persistence, AI streaming, and tool orchestration. Execution happens client-side in the WebContainer.

## Architecture Overview
```text
┌──────────────── Browser ────────────────┐      ┌──────── Server (TanStack) ────────┐
│  Chat Panel   Code Editor   Live Preview │      │  /api/chat (SSE streaming)        │
│      │            │              │        │ <--> │  agent loop + tool definitions    │
│   useChat     Monaco        iframe        │      │  Lovable AI + OpenAI/Anthropic    │
│      └──── Agent tool runner ─────┘       │      │  server fns: projects/files CRUD  │
│            │                              │      └──────────── Supabase ─────────────┘
│      WebContainer (npm, dev server, FS)   │            auth · projects · files · msgs
└──────────────────────────────────────────┘
```
Separation of concerns: **agent layer** (prompts, tools, streaming) is isolated from **UI layer** (panels) and **execution layer** (WebContainer adapter + virtual FS abstraction).

---

## Stage 1 — Agent Engine + Chat (foundation)
Goal: a working streaming AI agent with tool calls that produce file operations, persisted per project.

- Enable Lovable Cloud (Supabase) for auth + persistence; provision `LOVABLE_API_KEY`.
- Database schema (with RLS scoped to `auth.uid()` and GRANTs):
  - `projects` (id, user_id, name, template, created_at, updated_at)
  - `project_files` (id, project_id, path, content, updated_at) — the virtual FS
  - `chat_messages` (id, project_id, role, parts JSONB, created_at)
- Auth: email/password + Google sign-in, `/auth` page, `_authenticated` layout for the workspace.
- Server route `src/routes/api/chat.ts`: AI SDK `streamText` + `toUIMessageStreamResponse`, default model `google/gemini-3-flash-preview`, via the Lovable AI Gateway helper.
- Agent layer (`src/lib/agent/`): system prompt (adapted from the uploaded Dyad prompts), tool definitions with Zod schemas: `write_file`, `edit_file`, `delete_file`, `read_file`, `list_files`, `run_command`, `set_chat_summary`. `stopWhen: stepCountIs(50)`.
- Tool results stream back as message parts; the client renders text + tool activity (file changed, command queued).
- Chat persistence to `chat_messages` in `onFinish`; full history sent each turn.

Deliverable: type a prompt, watch the agent stream reasoning and emit file-write tool calls saved to the DB. No editor/preview yet.

## Stage 2 — In-Browser Execution + Live Preview (WebContainers)
Goal: the agent's file operations actually run.

- Add a WebContainer execution adapter (`src/lib/execution/`) behind a `FileSystem` interface so the agent layer stays decoupled.
- On project open: boot a WebContainer, hydrate it from `project_files`, run install, start the dev server, show it in a sandboxed iframe.
- Wire agent tool calls (`write_file`/`run_command`/etc.) to the WebContainer FS + process API; stream stdout/stderr to a terminal panel.
- Sync changes back to `project_files` (debounced) for persistence.
- Note: WebContainers require specific COOP/COEP cross-origin-isolation headers; we set those on the workspace route.

Deliverable: prompt → agent edits files → npm runs → live preview updates.

## Stage 3 — Full 3-Panel IDE
- Layout: Chat (left), Monaco multi-file editor + file-explorer tree (center), Live preview + terminal tabs (right). Resizable panes, dark theme.
- Monaco editor with open tabs, dirty state, save → WebContainer + DB.
- File explorer: create/rename/delete, reflecting the virtual FS.
- Terminal panel showing streamed command output; manual command input.
- Smooth animations, minimal modern dark UI using the design system.

## Stage 4 — App Lifecycle + Templates
- Dashboard: create project from prompt, list/load existing projects, delete.
- Starter templates (SaaS, landing page, game, browser-extension-style) used to seed the virtual FS.
- "New app from prompt" flow mirroring Dyad's `createApp`: scaffold template → kick off first agent turn.
- Project rename, duplicate, last-opened ordering.

## Stage 5 — Multi-Provider Keys + Polish
- Provider selector: Lovable AI (default, no key) **plus** user-supplied OpenAI/Anthropic keys (stored as Supabase secrets per the secrets flow; never in client code).
- Model picker per provider; route the chat endpoint to the chosen provider.
- Context compaction + chat summarization using the uploaded prompts when history grows large.
- Error surfacing (429/402/validation), loading/empty states, keyboard shortcuts, share/export project.

---

## Technical Notes
- Stack: TanStack Start + React 19 + TypeScript + Tailwind v4 + shadcn (supported equivalent of the requested Next.js/Tailwind stack). Streaming via SSE through the AI SDK.
- AI: AI SDK with Lovable AI Gateway provider; OpenAI/Anthropic via user keys in later stage. Tools defined with `tool()` + Zod, agent loop with `stopWhen`.
- Execution: `@webcontainer/api` in the browser; server never spawns processes. The `shell_handler.ts` security model (allow-listed operations, path validation) is reimplemented as guardrails in the tool layer.
- Persistence: Supabase tables above; `createServerFn` for file/project CRUD, RLS per user.
- Security: secrets server-side only, RLS on every table, sandboxed preview iframe, validated tool inputs.

## Risks / Trade-offs
- WebContainers are powerful but heavy (boot time, memory) and need cross-origin isolation; we isolate them behind an adapter so the rest of the app is unaffected.
- Real terminal execution is browser-bound by design; true server-side build infra is out of scope for this platform.
- This is a large multi-stage system; each stage ships independently and is verified before moving on.

I'll start with Stage 1 once you approve, and continue through each stage until complete.