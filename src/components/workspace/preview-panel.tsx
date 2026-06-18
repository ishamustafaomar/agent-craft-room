import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { FileMap } from "@/lib/execution/types";
import type { WCStatus } from "@/lib/execution/webcontainer-manager";
import {
  Monitor,
  TerminalSquare,
  Play,
  RotateCw,
  Loader2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

interface PreviewPanelProps {
  files: FileMap;
  terminal: string[];
  status: WCStatus;
  previewUrl: string | null;
  supported: boolean;
  onStart: () => void;
  headerActions?: React.ReactNode;
}

const STATUS_LABEL: Record<WCStatus, string> = {
  idle: "Idle",
  booting: "Booting sandbox…",
  installing: "Installing dependencies…",
  starting: "Starting dev server…",
  ready: "Running",
  error: "Error",
};

export function PreviewPanel({
  files,
  terminal,
  status,
  previewUrl,
  supported,
  onStart,
  headerActions,
}: PreviewPanelProps) {
  const [tab, setTab] = useState<"preview" | "terminal">("preview");
  const [iframeKey, setIframeKey] = useState(0);
  const fileCount = Object.keys(files).length;

  const isWorking =
    status === "booting" || status === "installing" || status === "starting";

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

        <div className="ml-auto flex items-center gap-2">
          {status !== "idle" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isWorking && <Loader2 className="h-3 w-3 animate-spin" />}
              {STATUS_LABEL[status]}
            </span>
          )}
          {previewUrl && (
            <button
              onClick={() => setIframeKey((k) => k + 1)}
              title="Reload preview"
              aria-label="Reload preview"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              title="Open in new tab"
              aria-label="Open preview in new tab"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {supported && status !== "idle" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onStart}
              disabled={isWorking}
              className="h-7 gap-1.5 px-2 text-xs"
            >
              <RotateCw className="h-3 w-3" />
              Restart
            </Button>
          )}
          {headerActions}
        </div>
      </div>

      {tab === "preview" ? (
        <div className="relative flex-1">
          {previewUrl ? (
            <iframe
              key={iframeKey}
              src={previewUrl}
              title="App preview"
              className="h-full w-full border-0 bg-white"
              allow="cross-origin-isolated"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              {!supported ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="text-sm font-medium">
                    Live preview needs cross-origin isolation
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    The in-browser sandbox runs on the published site (and any
                    browser tab that is cross-origin isolated). The agent can still
                    generate and edit all {fileCount} file
                    {fileCount === 1 ? "" : "s"} here.
                  </p>
                </>
              ) : isWorking ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <p className="text-sm font-medium">{STATUS_LABEL[status]}</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Spinning up your app in the browser. Watch the Terminal tab for
                    progress.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Play className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Run your app</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {fileCount} file{fileCount === 1 ? "" : "s"} ready. Boot the
                    in-browser sandbox to install dependencies and see a live preview.
                  </p>
                  <Button onClick={onStart} className="gap-1.5">
                    <Play className="h-4 w-4" />
                    Start preview
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <pre className="whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {terminal.length === 0 ? "No command output yet." : terminal.join("")}
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
