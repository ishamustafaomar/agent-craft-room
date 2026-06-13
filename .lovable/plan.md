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

## Stage 2 — In-Browser Execution + Live Preview (WebContainers) ✅ DONE
Goal: the agent's file operations actually run.

- Added `@webcontainer/api` and a `WebContainerManager` singleton (`src/lib/execution/webcontainer-manager.ts`): boot, mount (flat map → file tree), per-file write/delete mirroring, streamed `npm install` + `npm run dev`, `server-ready` → preview URL.
- `createWorkspaceRuntime` (`src/lib/execution/workspace-runtime.ts`) replaces the Stage 1 db-runtime: every agent file op persists to `project_files` AND mirrors into the live container (HMR); `run_command` routes to the container with streamed output; long-running serve commands are owned by the preview panel.
- Preview panel: "Start preview" boots the sandbox, shows status (booting/installing/starting/ready), live iframe, reload + open-in-new-tab, restart, and a streamed terminal tab.
- COOP/COEP cross-origin isolation: set via request middleware in `src/start.ts` (production runtime) and `vite preview` headers. The Lovable editor sandbox strips dev headers, so the panel detects `window.crossOriginIsolated` and shows a graceful fallback there; live preview activates on the published site.

Deliverable: prompt → agent edits files → npm runs in-browser → live preview updates (on the published / cross-origin-isolated site).


## Stage 3 — Full 3-Panel IDE ✅ DONE
- Layout: Chat (left), file-tree + Monaco editor (center), live preview + terminal tabs (right). All panes resizable, dark theme.
- Monaco editor (`code-editor.tsx`): multi-file tabs, dirty indicators, Ctrl/Cmd+S + Save button → writes to runtime (DB + container HMR), language detection by extension, agent edits reflected live in open non-dirty tabs.
- File tree (`file-tree.tsx`): nested collapsible folders, new file, inline rename, delete (confirm dialog) — all backed by the workspace runtime.
- Terminal panel streams command output; preview lifecycle controls (start/restart/reload/open).


## Stage 4 — App Lifecycle + Templates ✅ DONE
- Dashboard: "describe your app" prompt hero that scaffolds a project and auto-runs the first agent turn (via `?prompt=` search param), plus example prompt chips.
- Richer, distinct starter templates (landing page, SaaS dashboard, canvas game) each with real App + CSS.
- Project rename (dialog) and duplicate (clones metadata + all files) from the dashboard card menu.
- Last-opened ordering: opening a project touches `updated_at` so it surfaces first.

## Stage 5 — Multi-Provider Models + Polish ✅ DONE
- Model picker in the workspace header spanning both providers (Google Gemini + OpenAI GPT) through the Lovable AI Gateway — no user keys required. Selection persists per project in the browser and is validated server-side against an allow-list.
- Context compaction: the chat route trims to the most recent 40 messages before each model call; the running chat summary (set_chat_summary tool) preserves older context at the product level.
- Error surfacing: 429 (rate limit) and 402 (credits exhausted) are detected and shown as clear messages in-stream and via toast; client `onError` surfaces failures to the user.
- Project export: one-click "Export" button zips the virtual file system (JSZip) and downloads it.


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