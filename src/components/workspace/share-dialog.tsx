import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { setProjectPublic } from "@/lib/projects.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Share2, Copy, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

export function ShareDialog({
  projectId,
  initialPublic,
}: {
  projectId: string;
  initialPublic: boolean;
}) {
  const setPublicFn = useServerFn(setProjectPublic);
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/p/${projectId}` : "";

  async function toggle(next: boolean) {
    setSaving(true);
    try {
      await setPublicFn({ data: { projectId, isPublic: next } });
      setIsPublic(next);
      toast.success(next ? "App is now public" : "App is now private");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update sharing");
    } finally {
      setSaving(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this app</DialogTitle>
          <DialogDescription>
            Make your app public to share a live, read-only link with anyone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <Label htmlFor="public-toggle" className="text-sm">
            Public share link
          </Label>
          <Switch
            id="public-toggle"
            checked={isPublic}
            disabled={saving}
            onCheckedChange={toggle}
          />
        </div>

        {isPublic && (
          <div className="flex items-center gap-2">
            <Input readOnly value={shareUrl} className="text-xs" />
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              onClick={copy}
              aria-label="Copy share link"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <a href={shareUrl} target="_blank" rel="noreferrer">
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0"
                aria-label="Open share link in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
