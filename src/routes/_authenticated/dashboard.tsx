import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  Home,
  Search,
  Compass,
  Plug,
  FolderGit2,
  Star,
  User as UserIcon,
  Users,
  ChevronDown,
  PanelLeft,
  Plus,
  Mic,
  Gift,
  Zap,
  ArrowRight,
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

const PROJECT_TABS = [
  "My projects",
  "Recently viewed",
  "Starred",
  "Shared with me",
  "Most visitors today",
  "Templates",
] as const;

type ProjectTab = (typeof PROJECT_TABS)[number];

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
  const [planMode, setPlanMode] = useState<"Build" | "Plan">("Build");
  const [activeTab, setActiveTab] = useState<ProjectTab>("My projects");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function copyInvite() {
    const url = "https://breezyai.dev/";
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Invite link copied — share Breezy with a friend!"))
        .catch(() => toast.message("Share Breezy", { description: url }));
    } else {
      toast.message("Share Breezy", { description: url });
    }
  }


  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listFn(),
  });

  const firstName = useMemo(() => {
    const meta = (user?.user_metadata as { name?: string; full_name?: string } | undefined);
    const raw = meta?.name || meta?.full_name || user?.email?.split("@")[0] || "";
    if (!raw) return "there";
    const part = raw.split(/[\s._-]+/)[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
  }, [user]);

  const recents = useMemo(() => (projects ?? []).slice(0, 5), [projects]);

  const filteredProjects = useMemo(() => {
    const list = projects ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, search]);

  const createMut = useMutation({
    mutationFn: (vars: { name: string; template: string }) => createFn({ data: vars }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const promptText = prompt.trim();
      setPrompt("");
      navigate({
        to: "/project/$projectId",
        params: { projectId: project.id },
        search: { prompt: promptText || undefined },
      });
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

  const navMuted =
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[oklch(0.42_0.03_280)] transition-colors hover:bg-white/60 hover:text-[oklch(0.22_0.03_280)]";
  const navActive =
    "flex items-center gap-2.5 rounded-lg bg-white/70 px-2.5 py-2 text-sm font-medium text-[oklch(0.22_0.03_280)] shadow-soft";

  return (
    <div className="flex h-screen overflow-hidden bg-breezy-mesh text-[oklch(0.22_0.03_280)]">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/50 bg-white/45 backdrop-blur-xl md:flex">
        <div className="flex items-center justify-between px-4 py-4">
          <Link to="/dashboard" className="flex items-center">
            <BrandLogo size={24} />
          </Link>
          <button
            type="button"
            className="rounded-md p-1.5 text-[oklch(0.45_0.03_280)] transition-colors hover:bg-white/60"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace switcher */}
        <div className="px-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-lg border border-white/60 bg-white/60 px-2.5 py-2 text-left transition-colors hover:bg-white/80">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                  {(firstName[0] ?? "B").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {firstName}'s Breezy
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[oklch(0.5_0.03_280)]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem disabled className="opacity-70">
                {user?.email}
              </DropdownMenuItem>
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

        {/* Primary nav */}
        <nav className="mt-4 flex flex-col gap-0.5 px-3">
          <span className={navActive}>
            <Home className="h-4 w-4" /> Dashboard
          </span>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("project-search");
              el?.focus();
            }}
            className={navMuted}
          >
            <Search className="h-4 w-4" /> Search
            <span className="ml-auto rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-[oklch(0.5_0.03_280)]">
              ⌘K
            </span>
          </button>
          <Link to="/blog/how-to-build-web-app-with-ai" className={navMuted}>
            <Compass className="h-4 w-4" /> Resources
          </Link>
          <span className={navMuted}>
            <Plug className="h-4 w-4" /> Connectors
          </span>
        </nav>

        {/* Projects nav */}
        <div className="mt-5 px-3">
          <p className="px-2.5 pb-1.5 text-xs font-medium uppercase tracking-wide text-[oklch(0.55_0.03_280)]">
            Projects
          </p>
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => setActiveTab("My projects")} className={navMuted}>
              <FolderGit2 className="h-4 w-4" /> All projects
            </button>
            <button type="button" onClick={() => setActiveTab("Starred")} className={navMuted}>
              <Star className="h-4 w-4" /> Starred
            </button>
            <span className={navMuted}>
              <UserIcon className="h-4 w-4" /> Created by me
            </span>
            <button type="button" onClick={() => setActiveTab("Shared with me")} className={navMuted}>
              <Users className="h-4 w-4" /> Shared with me
            </button>
          </div>
        </div>

        {/* Recents */}
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3">
          <p className="px-2.5 pb-1.5 text-xs font-medium uppercase tracking-wide text-[oklch(0.55_0.03_280)]">
            Recents
          </p>
          <div className="flex flex-col gap-0.5">
            {recents.map((p) => (
              <Link
                key={p.id}
                to="/project/$projectId"
                params={{ projectId: p.id }}
                search={{ prompt: undefined }}
                className="truncate rounded-lg px-2.5 py-1.5 text-sm text-[oklch(0.42_0.03_280)] transition-colors hover:bg-white/60 hover:text-[oklch(0.22_0.03_280)]"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Footer cards */}
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/55 px-3 py-2.5">
            <Gift className="h-4 w-4 shrink-0 text-[oklch(0.55_0.12_300)]" />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">Share Breezy</p>
              <p className="truncate text-xs text-[oklch(0.5_0.03_280)]">Invite a friend</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/55 px-3 py-2.5">
            <Zap className="h-4 w-4 shrink-0 text-[oklch(0.7_0.15_60)]" />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">Upgrade</p>
              <p className="truncate text-xs text-[oklch(0.5_0.03_280)]">Unlock more features</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {(firstName[0] ?? "B").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-[oklch(0.45_0.03_280)]">
                  {user?.email}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
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
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Hero */}
        <section className="flex flex-col items-center px-6 pt-16 pb-8 text-center sm:pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/55 px-4 py-2 text-sm text-[oklch(0.4_0.03_280)] shadow-soft backdrop-blur">
            <Sparkles className="h-4 w-4 text-[oklch(0.55_0.12_300)]" />
            Connect all your tools
            <ArrowRight className="h-3.5 w-3.5" />
          </div>

          <h1 className="font-display text-4xl font-semibold tracking-tight text-[oklch(0.22_0.03_280)] sm:text-5xl">
            What should we build, {firstName}?
          </h1>

          <div className="mt-8 w-full max-w-3xl rounded-3xl border border-white/60 bg-white/70 p-3 text-left shadow-soft backdrop-blur">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleCreateFromPrompt();
                }
              }}
              placeholder="Ask Breezy to build a landing page for my…"
              className="min-h-[72px] resize-none border-0 bg-transparent text-base text-[oklch(0.22_0.03_280)] shadow-none placeholder:text-[oklch(0.55_0.03_280)] focus-visible:ring-0"
            />
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <TemplateGallery
                onSelect={(templateId: string) =>
                  createMut.mutate({
                    name:
                      deriveName(prompt) === "Untitled App"
                        ? TEMPLATES[templateId]?.name ?? "Untitled App"
                        : deriveName(prompt),
                    template: templateId,
                  })
                }
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-[oklch(0.45_0.03_280)] hover:bg-white/70"
                    aria-label="Browse templates"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                }
              />
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1.5 rounded-full text-sm text-[oklch(0.42_0.03_280)] hover:bg-white/70"
                    >
                      {planMode}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setPlanMode("Build")}>Build</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPlanMode("Plan")}>Plan</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DesignDirections
                  onApply={(brief) =>
                    setPrompt((cur) => (cur.trim() ? `${cur.trim()}\n\n${brief}` : brief))
                  }
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-[oklch(0.45_0.03_280)] hover:bg-white/70"
                      aria-label="Design directions"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  size="icon"
                  onClick={handleCreateFromPrompt}
                  disabled={createMut.isPending}
                  className="h-9 w-9 shrink-0 rounded-full"
                  aria-label="Start building"
                >
                  {createMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="rounded-3xl border border-white/60 bg-white/55 p-5 shadow-soft backdrop-blur">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/60 pb-3">
              <div className="flex flex-wrap items-center gap-1">
                {PROJECT_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={
                      activeTab === tab
                        ? "rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-medium text-[oklch(0.22_0.03_280)] shadow-soft"
                        : "rounded-full px-3.5 py-1.5 text-sm text-[oklch(0.45_0.03_280)] transition-colors hover:bg-white/50 hover:text-[oklch(0.22_0.03_280)]"
                    }
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative hidden sm:block">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[oklch(0.55_0.03_280)]" />
                  <Input
                    id="project-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    className="h-8 w-40 border-white/60 bg-white/60 pl-8 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5">
              {activeTab === "Templates" ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="text-sm text-[oklch(0.45_0.03_280)]">
                    Start from a ready-made template.
                  </p>
                  <TemplateGallery
                    onSelect={(templateId: string) =>
                      createMut.mutate({
                        name: TEMPLATES[templateId]?.name ?? "Untitled App",
                        template: templateId,
                      })
                    }
                    trigger={<Button variant="outline">Browse templates</Button>}
                  />
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-16 text-[oklch(0.4_0.03_280)]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Sparkles className="h-8 w-8 text-[oklch(0.55_0.12_300)]" />
                  <p className="text-[oklch(0.4_0.03_280)]">
                    No projects yet — describe an app above to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((p) => (
                    <Card
                      key={p.id}
                      className="group relative cursor-pointer border-white/60 bg-white/70 p-5 shadow-soft backdrop-blur transition-colors hover:bg-white/90"
                      onClick={() =>
                        navigate({
                          to: "/project/$projectId",
                          params: { projectId: p.id },
                          search: { prompt: undefined },
                        })
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
                      <h3 className="mt-4 font-medium tracking-tight text-[oklch(0.22_0.03_280)]">
                        {p.name}
                      </h3>
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
          </div>
        </section>
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
