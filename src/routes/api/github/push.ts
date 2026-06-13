import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  token: z.string().min(8).max(255),
  repo: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Repo name may only contain letters, numbers, dashes, dots, underscores"),
  isPrivate: z.boolean().default(true),
  files: z
    .array(
      z.object({
        path: z.string().min(1).max(400),
        content: z.string().max(500_000),
      }),
    )
    .min(1)
    .max(1000),
});

const GH = "https://api.github.com";

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Breezy-Export",
  };
}

// Pushes a project's files to GitHub using the Git Data API (single commit).
export const Route = createFileRoute("/api/github/push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require an authenticated Breezy user before acting as a GitHub proxy.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return Response.json({ error: "Server not configured" }, { status: 500 });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const authClient = createClient(supabaseUrl, supabaseKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: userData, error: userError } = await authClient.auth.getUser(token);
        if (userError || !userData.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let parsed: z.infer<typeof BodySchema>;
        try {
          parsed = BodySchema.parse(await request.json());
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Invalid request" },
            { status: 400 },
          );
        }
        const { token, repo, isPrivate, files } = parsed;
        const headers = ghHeaders(token);

        try {
          // 1. Identify the authenticated user.
          const meRes = await fetch(`${GH}/user`, { headers });
          if (!meRes.ok) {
            return Response.json({ error: "Invalid GitHub token" }, { status: 401 });
          }
          const me = (await meRes.json()) as { login: string };
          const owner = me.login;

          // 2. Create the repo if it does not exist yet.
          const repoRes = await fetch(`${GH}/repos/${owner}/${repo}`, { headers });
          if (repoRes.status === 404) {
            const createRes = await fetch(`${GH}/user/repos`, {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ name: repo, private: isPrivate, auto_init: true }),
            });
            if (!createRes.ok) {
              const detail = await createRes.text();
              return Response.json(
                { error: `Failed to create repo: ${detail}` },
                { status: 502 },
              );
            }
            // Give GitHub a moment to initialize the default branch.
            await new Promise((r) => setTimeout(r, 1200));
          } else if (!repoRes.ok) {
            return Response.json({ error: "Could not access repository" }, { status: 502 });
          }

          // 3. Resolve the default branch + its current commit/tree.
          const infoRes = await fetch(`${GH}/repos/${owner}/${repo}`, { headers });
          const info = (await infoRes.json()) as { default_branch: string };
          const branch = info.default_branch || "main";

          const refRes = await fetch(`${GH}/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
            headers,
          });
          const ref = (await refRes.json()) as { object?: { sha: string } };
          const baseCommitSha = ref.object?.sha;

          let baseTreeSha: string | undefined;
          if (baseCommitSha) {
            const commitRes = await fetch(
              `${GH}/repos/${owner}/${repo}/git/commits/${baseCommitSha}`,
              { headers },
            );
            const commit = (await commitRes.json()) as { tree?: { sha: string } };
            baseTreeSha = commit.tree?.sha;
          }

          // 4. Create blobs + a tree for all files.
          const tree = await Promise.all(
            files.map(async (f) => {
              const blobRes = await fetch(`${GH}/repos/${owner}/${repo}/git/blobs`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
              });
              const blob = (await blobRes.json()) as { sha: string };
              return {
                path: f.path,
                mode: "100644" as const,
                type: "blob" as const,
                sha: blob.sha,
              };
            }),
          );

          const treeRes = await fetch(`${GH}/repos/${owner}/${repo}/git/trees`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ base_tree: baseTreeSha, tree }),
          });
          const newTree = (await treeRes.json()) as { sha: string };

          // 5. Create a commit and move the branch ref to it.
          const commitRes = await fetch(`${GH}/repos/${owner}/${repo}/git/commits`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "Sync from Breezy",
              tree: newTree.sha,
              parents: baseCommitSha ? [baseCommitSha] : [],
            }),
          });
          const newCommit = (await commitRes.json()) as { sha: string };

          await fetch(`${GH}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ sha: newCommit.sha, force: false }),
          });

          return Response.json({
            ok: true,
            url: `https://github.com/${owner}/${repo}`,
          });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "GitHub push failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
