import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { publishProject } from "@/lib/projects.functions";
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
import { Textarea } from "@/components/ui/textarea";
import { Rocket, Copy, ExternalLink, Check, Loader2, Globe, Info } from "lucide-react";
import { toast } from "sonner";

const VANITY_DOMAIN = "breezyai.dev";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function PublishDialog({
  projectId,
  projectName,
  initialDescription = "",
  initialSlug,
}: {
  projectId: string;
  projectName: string;
  initialDescription?: string;
  initialSlug?: string | null;
}) {
  const publishFn = useServerFn(publishProject);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState(initialDescription);
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(initialSlug ?? null);
  const [copied, setCopied] = useState<"url" | "vanity" | null>(null);

  const previewSlug = useMemo(() => slugify(name) || "app", [name]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // The working link: served by this app at /app/{slug} on the live domain.
  const liveUrl = publishedSlug ? `${origin}/app/${publishedSlug}` : "";
  // The aspirational vanity address (not yet routable — see the note below).
  const vanityUrl = publishedSlug
    ? `https://${publishedSlug}.${VANITY_DOMAIN}`
    : `https://${previewSlug}.${VANITY_DOMAIN}`;

  async function handlePublish() {
    if (!name.trim()) {
      toast.error("Give your app a name first");
      return;
    }
    setPublishing(true);
    try {
      const res = await publishFn({
        data: { projectId, name: name.trim(), description: description.trim() },
      });
      setPublishedSlug(res.slug);
      toast.success("Your app is live!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  function copy(text: string, which: "url" | "vanity") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    toast.success("Link copied");
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5">
          <Rocket className="h-3.5 w-3.5" />
          Publish
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish your app</DialogTitle>
          <DialogDescription>
            Give your app a name and description, then publish it to a live,
            shareable web address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="app-name">App name</Label>
            <Input
              id="app-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome app"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="app-desc">Description</Label>
            <Textarea
              id="app-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short summary of what your app does."
              rows={3}
              maxLength={300}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              Your app will be published at
            </div>
            <code className="mt-1 block break-all font-mono text-sm text-foreground">
              {origin || "https://breezyai.dev"}/app/{publishedSlug ?? previewSlug}
            </code>
          </div>
        </div>

        {publishedSlug && (
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Check className="h-4 w-4 text-primary" /> Live now
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly value={liveUrl} className="h-8 text-xs" />
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                onClick={() => copy(liveUrl, "url")}
                aria-label="Copy published link"
              >
                {copied === "url" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <a href={liveUrl} target="_blank" rel="noreferrer">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  aria-label="Open published app"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>

            <div className="flex gap-2 rounded-md bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                The vanity address{" "}
                <code className="font-mono text-foreground">{vanityUrl.replace("https://", "")}</code>{" "}
                isn&apos;t routable yet — wildcard subdomains need extra hosting
                setup (see notes). Use the link above to share your app today.
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handlePublish} disabled={publishing} className="gap-1.5">
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {publishedSlug ? "Update & republish" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
