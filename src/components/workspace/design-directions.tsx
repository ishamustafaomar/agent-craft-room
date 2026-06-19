import { useState } from "react";
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
import { Wand2, Check } from "lucide-react";

const PALETTES = [
  { id: "mint", label: "Fresh Mint", colors: ["#0f766e", "#2dd4bf", "#a7f3d0", "#f0fdfa"] },
  { id: "indigo", label: "Midnight Indigo", colors: ["#0a0a1a", "#1e1e5a", "#4f46e5", "#a5b4fc"] },
  { id: "sunset", label: "Sunset Blaze", colors: ["#ff6b35", "#f7931e", "#e84393", "#fff7ed"] },
  { id: "paper", label: "Paper & Ink", colors: ["#f5f3ee", "#e8e4dd", "#2d2d2d", "#0d0d0d"] },
];

const VIBES = [
  { id: "minimal", label: "Minimal & clean", brief: "minimal, lots of whitespace, restrained typography" },
  { id: "bold", label: "Bold & playful", brief: "bold colors, big rounded shapes, energetic and playful" },
  { id: "elegant", label: "Elegant & premium", brief: "elegant, refined, premium feel with subtle shadows and serif accents" },
];

const LAYOUTS = [
  { id: "hero", label: "Hero + features" },
  { id: "split", label: "Split screen" },
  { id: "dashboard", label: "Dashboard" },
];

/**
 * Lightweight design-direction picker. Collects a palette, vibe, and layout and
 * hands back a concise creative brief that gets prepended to the build prompt.
 */
export function DesignDirections({
  onApply,
  trigger,
}: {
  onApply: (brief: string) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(PALETTES[0]);
  const [vibe, setVibe] = useState(VIBES[0]);
  const [layout, setLayout] = useState(LAYOUTS[0]);

  function apply() {
    const brief = `Design direction: ${vibe.brief}. Use a "${palette.label}" color palette (${palette.colors.join(", ")}) as the basis for the design tokens. Prefer a ${layout.label.toLowerCase()} layout. Make it polished and responsive.`;
    onApply(brief);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="flex items-center gap-1 rounded-full border border-dashed border-primary/50 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
          >
            <Wand2 className="h-3 w-3" /> Design it for me
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pick a design direction</DialogTitle>
          <DialogDescription>
            We&apos;ll add this as guidance so your app looks the way you want from the first build.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Color palette</p>
            <div className="grid grid-cols-2 gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p)}
                  className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
                    palette.id === p.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="flex">
                    {p.colors.map((c) => (
                      <span
                        key={c}
                        className="h-5 w-5 rounded-sm border border-black/5"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <span className="text-xs">{p.label}</span>
                  {palette.id === p.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Vibe</p>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVibe(v)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    vibe.id === v.id ? "border-primary bg-primary/10" : "border-border text-muted-foreground"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Layout</p>
            <div className="flex flex-wrap gap-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLayout(l)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    layout.id === l.id ? "border-primary bg-primary/10" : "border-border text-muted-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={apply} className="gap-1.5">
            <Wand2 className="h-4 w-4" /> Apply direction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
