import { useState } from "react";
import { TEMPLATES } from "@/lib/agent/templates";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Sparkles, LayoutDashboard, Gamepad2, FileCode } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  blank: FileCode,
  landing: Sparkles,
  saas: LayoutDashboard,
  game: Gamepad2,
};

/**
 * Opt-in template browser. Nothing here is forced — users can ignore it and
 * just describe an app. Picking a template starts a project from that starter.
 */
export function TemplateGallery({
  onSelect,
  trigger,
}: {
  onSelect: (templateId: string) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Browse templates
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>
            Optional — pick a starting point, or close this and just describe your app.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.values(TEMPLATES).map((tpl) => {
            const Icon = ICONS[tpl.id] ?? FileCode;
            return (
              <button
                key={tpl.id}
                onClick={() => {
                  setOpen(false);
                  onSelect(tpl.id);
                }}
                className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <span className="font-medium tracking-tight">{tpl.name}</span>
                <span className="text-sm text-muted-foreground">{tpl.description}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
