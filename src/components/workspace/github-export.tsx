import { useState } from "react";
import type { FileMap } from "@/lib/execution/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Github, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function GithubExport({
  getFiles,
  defaultRepo,
}: {
  getFiles: () => FileMap;
  defaultRepo: string;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState(defaultRepo);
  const [isPrivate, setIsPrivate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function push() {
    if (!token.trim() || !repo.trim()) {
      toast.error("Enter a token and repository name");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const files = Object.entries(getFiles()).map(([path, content]) => ({ path, content }));
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), repo: repo.trim(), isPrivate, files }),
      });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Push failed");
      setResult(data.url ?? null);
      toast.success("Pushed to GitHub");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "GitHub push failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setToken("");
          setResult(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Github className="h-3.5 w-3.5" />
          GitHub
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Push to GitHub</DialogTitle>
          <DialogDescription>
            Export this project to a GitHub repository. Your token is used once for this
            push and is never stored.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gh-token" className="text-sm">
              Personal access token
            </Label>
            <Input
              id="gh-token"
              type="password"
              placeholder="ghp_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Create one at github.com/settings/tokens with the <code>repo</code> scope.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gh-repo" className="text-sm">
              Repository name
            </Label>
            <Input
              id="gh-repo"
              placeholder="my-breezy-app"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="gh-private" className="text-sm">
              Private repository
            </Label>
            <Switch id="gh-private" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {result && (
            <a
              href={result}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {result} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <DialogFooter>
          <Button onClick={push} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
            Push to GitHub
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
