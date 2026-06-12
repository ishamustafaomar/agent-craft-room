import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FileMap } from "@/lib/execution/types";
import { Monitor, TerminalSquare, Rocket } from "lucide-react";

interface PreviewPanelProps {
  files: FileMap;
  terminal: string[];
}

export function PreviewPanel({ files, terminal }: PreviewPanelProps) {
  const [tab, setTab] = useState<"preview" | "terminal">("preview");
  const fileCount = Object.keys(files).length;

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <TabButton
          active={tab === "preview"}
          onClick={() => setTab("preview")}
          icon={<Monitor className="h-3.5 w-3.5" />}
          label="Preview"
        />
        <TabButton
          active={tab === "terminal"}
          onClick={() => setTab("terminal")}
          icon={<TerminalSquare className="h-3.5 w-3.5" />}
          label="Terminal"
        />
      </div>

      {tab === "preview" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium">Live preview is coming next</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            The agent has written {fileCount} file{fileCount === 1 ? "" : "s"}. Once the
            in-browser sandbox is enabled, your app will run and render here in real time.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <pre className="p-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {terminal.length === 0
              ? "No command output yet."
              : terminal.join("\n")}
          </pre>
        </ScrollArea>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
