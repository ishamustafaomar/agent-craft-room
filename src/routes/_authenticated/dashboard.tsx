import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listProjects,
  createProject,
  deleteProject,
} from "@/lib/projects.functions";
import { TEMPLATES } from "@/lib/agent/templates";
import { useAuth, signOut } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Loader2,
  MoreVertical,
  Trash2,
  LogOut,
  Code2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const listFn = useServerFn(listProjects);
  const createFn = useServerFn(createProject);
  const deleteFn = useServerFn(deleteProject);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listFn(),
  });

  const createMut = useMutation({
    mutationFn: (vars: { name: string; template: string }) => createFn({ data: vars }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setName("");
      navigate({ to: "/project/$projectId", params: { projectId: project.id } });
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">Forge AI</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build full-stack apps by chatting with the AI agent.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Project name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My awesome app"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Template</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(TEMPLATES).map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setTemplate(tpl.id)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          template === tpl.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Code2 className="h-4 w-4 text-primary" />
                          {tpl.name}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tpl.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    createMut.mutate({ name: name.trim() || "Untitled App", template })
                  }
                  disabled={createMut.isPending}
                >
                  {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create & open
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !projects || projects.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No projects yet.</p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Create your first project
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  className="group relative cursor-pointer p-5 transition-colors hover:border-primary/50"
                  onClick={() =>
                    navigate({ to: "/project/$projectId", params: { projectId: p.id } })
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Code2 className="h-5 w-5 text-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                  <h3 className="mt-4 font-medium tracking-tight">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {p.chat_summary || TEMPLATES[p.template]?.name || "No activity yet"}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Updated {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
