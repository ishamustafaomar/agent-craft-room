import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listProjects,
  createProject,
  deleteProject,
  duplicateProject,
  renameProject,
} from "@/lib/projects.functions";
import { TEMPLATES } from "@/lib/agent/templates";
import { useAuth, signOut } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { TemplateGallery } from "@/components/workspace/template-gallery";
import { DesignDirections } from "@/components/workspace/design-directions";
import {
  Sparkles,
  Loader2,
  MoreVertical,
  Trash2,
  LogOut,
  Code2,
  ArrowUp,
  Copy,
  Pencil,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Breezy" },
      { name: "description", content: "Your Breezy projects. Create, manage, and vibe-code beautiful apps in minutes." },
      { property: "og:title", content: "Dashboard · Breezy" },
      { property: "og:description", content: "Your Breezy projects. Create, manage, and vibe-code beautiful apps in minutes." },
    ],
  }),
  component: Dashboard,
});

const PROMPT_IDEAS = [
  "A todo app with dark mode and local storage",
  "A landing page for a coffee subscription startup",
  "A pomodoro timer with sound alerts",
  "A markdown notes app with search",
];

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const listFn = useServerFn(listProjects);
  const createFn = useServerFn(createProject);
  const deleteFn = useServerFn(deleteProject);
  const duplicateFn = useServerFn(duplicateProject);
  const renameFn = useServerFn(renameProject);

  const [prompt, setPrompt] = useState("");
  const [template] = useState("blank");
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listFn(),
  });

  const createMut = useMutation({
    mutationFn: (vars: { name: string; template: string }) => createFn({ data: vars }),
    onSuccess: (project, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const promptText = prompt.trim();
      setPrompt("");
      navigate({
        to: "/project/$projectId",
        params: { projectId: project.id },
        search: { prompt: promptText || undefined },
      });
      void vars;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create"),
  });

  const deleteMut = useMutation({
    mutationFn: (projectId: string) => deleteFn({ data: { projectId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const duplicateMut = useMutation({
    mutationFn: (projectId: string) => duplicateFn({ data: { projectId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project duplicated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to duplicate"),
  });

  const renameMut = useMutation({
    mutationFn: (vars: { projectId: string; name: string }) => renameFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setRenameTarget(null);
      toast.success("Project renamed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to rename"),
  });

  function deriveName(text: string) {
    const cleaned = text.trim().replace(/\s+/g, " ");
    if (!cleaned) return "Untitled App";
    return cleaned.length > 60 ? `${cleaned.slice(0, 57)}…` : cleaned;
  }

  function handleCreateFromPrompt() {
    if (createMut.isPending) return;
    createMut.mutate({ name: deriveName(prompt), template });
  }

  return (
    <div className="min-h-screen bg-breezy-mesh text-[oklch(0.22_0.03_280)]">
      <header className="border-b border-[oklch(0.22_0.03_280/0.1)] bg-white/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center">
            <BrandLogo size={26} />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 hover:bg-white/50">
                <span className="text-sm text-[oklch(0.4_0.03_280)]">{user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/auth" });
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Build-from-prompt hero */}
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[oklch(0.22_0.03_280)] sm:text-4xl">
            What do you want to build?
          </h1>
          <p className="mt-2 text-sm text-[oklch(0.4_0.03_280)]">
            Describe your app and the agent will scaffold it and start building.
          </p>

          <div className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-3 text-left shadow-soft backdrop-blur">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleCreateFromPrompt();
                }
              }}
              placeholder="e.g. A habit tracker with streaks, reminders, and a weekly chart"
              className="min-h-[88px] resize-none border-0 bg-transparent text-[oklch(0.22_0.03_280)] shadow-none placeholder:text-[oklch(0.55_0.03_280)] focus-visible:ring-0"
            />
            <div className="flex items-center justify-end gap-2 px-1 pt-1">
              <Button
                size="icon"
                onClick={handleCreateFromPrompt}
                disabled={createMut.isPending}
                className="shrink-0"
              >
                {createMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {PROMPT_IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setPrompt(idea)}
                className="rounded-full border border-white/60 bg-white/50 px-3 py-1 text-xs text-[oklch(0.4_0.03_280)] backdrop-blur transition-colors hover:bg-white hover:text-[oklch(0.22_0.03_280)]"
              >
                {idea}
              </button>
            ))}
            <TemplateGallery
              onSelect={(templateId: string) =>
                createMut.mutate({
                  name: deriveName(prompt) === "Untitled App" ? TEMPLATES[templateId]?.name ?? "Untitled App" : deriveName(prompt),
                  template: templateId,
                })
              }
              trigger={
                <button
                  type="button"
                  className="rounded-full border border-dashed border-white/70 bg-white/40 px-3 py-1 text-xs text-[oklch(0.4_0.03_280)] backdrop-blur transition-colors hover:bg-white hover:text-[oklch(0.22_0.03_280)]"
                >
                  Browse templates
                </button>
              }
            />
            <DesignDirections
              onApply={(brief) =>
                setPrompt((cur) => (cur.trim() ? `${cur.trim()}\n\n${brief}` : brief))
              }
            />
          </div>
        </section>

        {/* Projects */}
        <div className="mt-14 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-[oklch(0.22_0.03_280)]">Your projects</h2>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-[oklch(0.4_0.03_280)]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !projects || projects.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 border-white/60 bg-white/60 py-16 text-center shadow-soft backdrop-blur">
              <Sparkles className="h-8 w-8 text-[oklch(0.55_0.12_300)]" />
              <p className="text-[oklch(0.4_0.03_280)]">
                No projects yet — describe an app above to get started.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  className="group relative cursor-pointer border-white/60 bg-white/60 p-5 shadow-soft backdrop-blur transition-colors hover:bg-white/80"
                  onClick={() =>
                    navigate({ to: "/project/$projectId", params: { projectId: p.id }, search: { prompt: undefined } })
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/70">
                      <Code2 className="h-5 w-5 text-[oklch(0.55_0.12_300)]" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/60">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameTarget({ id: p.id, name: p.name });
                            setRenameValue(p.name);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateMut.mutate(p.id);
                          }}
                        >
                          <Copy className="h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMut.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="mt-4 font-medium tracking-tight text-[oklch(0.22_0.03_280)]">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[oklch(0.4_0.03_280)]">
                    {p.chat_summary || TEMPLATES[p.template]?.name || "No activity yet"}
                  </p>
                  <p className="mt-3 text-xs text-[oklch(0.5_0.03_280)]">
                    Updated {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameTarget && renameValue.trim()) {
                renameMut.mutate({ projectId: renameTarget.id, name: renameValue.trim() });
              }
            }}
            placeholder="Project name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                renameTarget &&
                renameValue.trim() &&
                renameMut.mutate({ projectId: renameTarget.id, name: renameValue.trim() })
              }
              disabled={!renameValue.trim() || renameMut.isPending}
            >
              {renameMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
