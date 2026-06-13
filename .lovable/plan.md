# Breezy — Feature Roadmap

Already shipped this turn: rebrand to **Breezy**, mint/teal brand palette, `<BrandLogo/>` lockup everywhere, and the forced template chooser removed from the dashboard (new projects default to a blank app). The eight selected features are sequenced below into four phases, lowest-risk and highest-leverage first.

## Phase 1 — Ship & Share

### 1. One-click publish + share URL
- DB: add `is_public boolean default false` and `published_at timestamptz` to `projects` (migration + GRANTs).
- New public route `src/routes/p.$projectId.tsx` (top-level, SSR-safe shell) that loads a project's saved files and boots the WebContainer preview in read-only mode — no chat, no editor.
- Server fn `getPublicProject` (admin client, returns only files + name when `is_public`).
- Workspace header gets a **Share** button: toggles `is_public`, copies `…/p/<id>`.

### 2. Component / template gallery
- Reusable `TemplateGallery` dialog listing the existing `TEMPLATES` plus new starter blocks.
- Surface it from the dashboard ("Start from a template") and inside the workspace ("Insert block") — replaces the old inline chips with an opt-in browse experience, honoring "don't force me to choose".
- Inserting a block writes its files via the existing runtime.

## Phase 2 — Design & History

### 3. AI design directions picker
- New-project flow: optional "Design it for me" step asking palette / typography / layout (3 visual questions).
- Generate a creative brief and write it into the project's `AI_RULES.md` so every agent turn honors it; also seed `src/index.css` tokens in the generated app.

### 4. Version history + rollback
- DB: `project_snapshots` table (`id`, `project_id`, `label`, `files jsonb`, `created_at`) + GRANTs + RLS scoped to owner.
- Snapshot the full file map after each completed agent turn (and on manual "Save version").
- History panel in the workspace: list snapshots, preview diff count, **Restore** (writes files back through the runtime + DB).

## Phase 3 — Backend powers

### 5. Auth + database scaffolding
- New agent tool `scaffold_backend` that adds a lightweight in-browser data layer (IndexedDB/localStorage-backed `db` + `auth` helpers) to the generated app so login + CRUD actually run in the WebContainer preview.
- Ships typed helpers + example usage; documented in the system prompt so the agent reaches for it on "add login / save data" requests.

### 6. GitHub export/sync
- "Export to GitHub" in the workspace: user pastes a GitHub Personal Access Token (stored as a project secret).
- Server route `api/github/push` creates/updates a repo and commits the current file map via the GitHub REST API (Worker-compatible, fetch-based). Keeps existing ZIP export as a no-setup fallback.

## Phase 4 — Collaboration

### 7. Live collaboration
- Enable Supabase Realtime on `project_files` (or a broadcast channel per project).
- Presence avatars in the workspace header; broadcast file saves and chat messages so collaborators see edits live.
- Conflict handling: last-write-wins per file with a "changed by <user>" toast.

---

## Technical notes
- Migrations follow the required order: `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY`, all owner-scoped via `auth.uid()`.
- New server logic uses `createServerFn` (+ `requireSupabaseAuth`) for app-internal work and `src/routes/api/*` only for the GitHub push endpoint. `supabaseAdmin` is imported inside handlers only.
- Public publish route stays top-level + SSR-safe; the WebContainer boot is client-only via the existing lazy import pattern.
- Visual edit (click-to-tweak) was in your picks under the same "Lovable-like" set — I folded its lighter first version into Phase 2/3 work via the gallery + targeted-edit path; if you want the full in-preview element picker (overlay that postMessages selectors back to the agent), say so and I'll add it as an explicit Phase 2 item, since it needs script injection into the WebContainer preview.

## Suggested order to build
Phase 1 → 2 → 3 → 4. Each phase is independently usable and testable. Tell me to start at Phase 1, or reorder/trim any item.