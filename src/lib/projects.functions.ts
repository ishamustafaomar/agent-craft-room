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
      .select("id, name, template, chat_summary, created_at, updated_at")
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
