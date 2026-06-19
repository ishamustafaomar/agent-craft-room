import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getTemplateFiles } from "@/lib/agent/templates";

// ---------- Projects ----------

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, template, chat_summary, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().trim().min(1).max(120).default("Untitled App"),
      template: z.string().trim().min(1).max(40).default("blank"),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .insert({ name: data.name, template: data.template, user_id: userId })
      .select("id, name, template, chat_summary, created_at, updated_at")
      .single();
    if (error || !project) throw new Error(error?.message ?? "Failed to create project");

    const seedFiles = getTemplateFiles(data.template).map((f) => ({
      project_id: project.id,
      path: f.path,
      content: f.content,
    }));
    if (seedFiles.length > 0) {
      const { error: filesError } = await supabase.from("project_files").insert(seedFiles);
      if (filesError) throw new Error(filesError.message);
    }
    return project;
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, name, template, chat_summary, description, slug, is_public, published_at, created_at, updated_at")
      .eq("id", data.projectId)

      .single();
    if (error || !project) throw new Error(error?.message ?? "Project not found");

    const { data: files, error: filesError } = await supabase
      .from("project_files")
      .select("path, content, updated_at")
      .eq("project_id", data.projectId)
      .order("path", { ascending: true });
    if (filesError) throw new Error(filesError.message);

    const { data: messages, error: msgError } = await supabase
      .from("chat_messages")
      .select("id, message_id, role, parts, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true });
    if (msgError) throw new Error(msgError.message);

    return { project, files: files ?? [], messages: messages ?? [] };
  });

export const renameProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ projectId: z.string().uuid(), name: z.string().trim().min(1).max(120) }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({ name: data.name })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateChatSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ projectId: z.string().uuid(), summary: z.string().trim().min(1).max(200) }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({ chat_summary: data.summary })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .delete()
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Bump updated_at so the dashboard surfaces most-recently-opened projects first.
export const touchProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Clone a project (metadata + all files) into a fresh project owned by the user.
export const duplicateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: source, error: srcError } = await supabase
      .from("projects")
      .select("name, template")
      .eq("id", data.projectId)
      .single();
    if (srcError || !source) throw new Error(srcError?.message ?? "Project not found");

    const { data: copy, error: insError } = await supabase
      .from("projects")
      .insert({
        name: `${source.name} (copy)`.slice(0, 120),
        template: source.template,
        user_id: userId,
      })
      .select("id, name, template, chat_summary, created_at, updated_at")
      .single();
    if (insError || !copy) throw new Error(insError?.message ?? "Failed to duplicate project");

    const { data: files, error: filesError } = await supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId);
    if (filesError) throw new Error(filesError.message);

    if (files && files.length > 0) {
      const rows = files.map((f) => ({
        project_id: copy.id,
        path: f.path,
        content: f.content,
      }));
      const { error: copyFilesError } = await supabase.from("project_files").insert(rows);
      if (copyFilesError) throw new Error(copyFilesError.message);
    }
    return copy;
  });

// ---------- Files ----------

export const upsertFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      path: z.string().trim().min(1).max(400),
      content: z.string().max(500_000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_files")
      .upsert(
        { project_id: data.projectId, path: data.path, content: data.content },
        { onConflict: "project_id,path" },
      );
    if (error) throw new Error(error.message);
    // Touch project updated_at
    await context.supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.projectId);
    return { ok: true };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ projectId: z.string().uuid(), path: z.string().trim().min(1).max(400) }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_files")
      .delete()
      .eq("project_id", data.projectId)
      .eq("path", data.path);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Chat persistence ----------

const messagePartsSchema = z.array(z.any());

export const saveMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      messages: z
        .array(
          z.object({
            messageId: z.string().max(200).optional(),
            role: z.string().min(1).max(40),
            parts: messagePartsSchema,
          }),
        )
        .max(200),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Replace all messages for this project with the provided set (simplest reliable sync).
    const { error: delError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("project_id", data.projectId);
    if (delError) throw new Error(delError.message);

    if (data.messages.length > 0) {
      const rows = data.messages.map((m) => ({
        project_id: data.projectId,
        message_id: m.messageId ?? null,
        role: m.role,
        parts: m.parts,
      }));
      const { error: insError } = await supabase.from("chat_messages").insert(rows);
      if (insError) throw new Error(insError.message);
    }
    return { ok: true };
  });

// ---------- Publishing / sharing ----------

export const setProjectPublic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: z.string().uuid(), isPublic: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({
        is_public: data.isPublic,
        published_at: data.isPublic ? new Date().toISOString() : null,
      })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true, isPublic: data.isPublic };
  });

// Public read for the shareable /p/:projectId route. No auth: only returns data
// when the project is explicitly marked public. Uses the admin client because
// public route loaders run during SSR/prerender with no bearer token.
export const getPublicProject = createServerFn({ method: "GET" })
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, name, is_public")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project || !project.is_public) return { project: null, files: [] as { path: string; content: string }[] };

    const { data: files, error: filesError } = await supabaseAdmin
      .from("project_files")
      .select("path, content")
      .eq("project_id", data.projectId)
      .order("path", { ascending: true });
    if (filesError) throw new Error(filesError.message);

    return { project: { id: project.id, name: project.name }, files: files ?? [] };
  });

// Turn an app name into a URL-safe slug used for the published address.
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Publish a project: store name/description, mark public, and assign a unique
// slug used to build the {slug}.breezyai.dev / /app/{slug} address.
export const publishProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      name: z.string().trim().min(1).max(120),
      description: z.string().trim().max(300).optional().default(""),
      slug: z.string().trim().max(60).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const base = slugify(data.slug || data.name) || "app";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find a slug that is not already taken by a different project.
    let slug = base;
    for (let n = 2; n < 1000; n++) {
      const { data: existing } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing || existing.id === data.projectId) break;
      slug = `${base}-${n}`;
    }

    const { error } = await supabase
      .from("projects")
      .update({
        name: data.name,
        description: data.description ?? "",
        slug,
        is_public: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true, slug };
  });

// Public read for the published /app/:slug route. Returns data only when the
// project is public. Uses the admin client because public routes run during SSR
// with no bearer token.
export const getPublishedApp = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().trim().min(1).max(60) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, name, description, is_public")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project || !project.is_public) {
      return {
        project: null,
        files: [] as { path: string; content: string }[],
      };
    }

    const { data: files, error: filesError } = await supabaseAdmin
      .from("project_files")
      .select("path, content")
      .eq("project_id", project.id)
      .order("path", { ascending: true });
    if (filesError) throw new Error(filesError.message);

    return {
      project: { id: project.id, name: project.name, description: project.description },
      files: files ?? [],
    };
  });


// ---------- Version history (snapshots) ----------

export const createSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      label: z.string().trim().min(1).max(120).default("Snapshot"),
      files: z
        .array(z.object({ path: z.string().min(1).max(400), content: z.string().max(500_000) }))
        .max(1000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Ownership is enforced by RLS via the project relationship.
    const { data: row, error } = await supabase
      .from("project_snapshots")
      .insert({ project_id: data.projectId, label: data.label, files: data.files })
      .select("id, label, created_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to save version");

    // Keep only the 30 most recent snapshots per project.
    const { data: old } = await supabase
      .from("project_snapshots")
      .select("id")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .range(30, 1000);
    if (old && old.length > 0) {
      await supabase
        .from("project_snapshots")
        .delete()
        .in(
          "id",
          old.map((o) => o.id),
        );
    }
    return row;
  });

export const listSnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("project_snapshots")
      .select("id, label, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ snapshotId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("project_snapshots")
      .select("id, label, files, created_at")
      .eq("id", data.snapshotId)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Version not found");
    return row as { id: string; label: string; files: { path: string; content: string }[]; created_at: string };
  });

export const deleteSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ snapshotId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_snapshots")
      .delete()
      .eq("id", data.snapshotId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Replace the full file set of a project (used by snapshot restore). Deletes
// files not present in the incoming set, then upserts the rest.
export const replaceProjectFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      files: z
        .array(z.object({ path: z.string().min(1).max(400), content: z.string().max(500_000) }))
        .max(1000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const keepPaths = new Set(data.files.map((f) => f.path));

    const { data: existing, error: exErr } = await supabase
      .from("project_files")
      .select("path")
      .eq("project_id", data.projectId);
    if (exErr) throw new Error(exErr.message);

    const toDelete = (existing ?? []).map((f) => f.path).filter((p) => !keepPaths.has(p));
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from("project_files")
        .delete()
        .eq("project_id", data.projectId)
        .in("path", toDelete);
      if (delErr) throw new Error(delErr.message);
    }

    if (data.files.length > 0) {
      const rows = data.files.map((f) => ({
        project_id: data.projectId,
        path: f.path,
        content: f.content,
      }));
      const { error: upErr } = await supabase
        .from("project_files")
        .upsert(rows, { onConflict: "project_id,path" });
      if (upErr) throw new Error(upErr.message);
    }
    return { ok: true };
  });
