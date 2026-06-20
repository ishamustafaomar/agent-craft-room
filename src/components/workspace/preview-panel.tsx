import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { FileMap } from "@/lib/execution/types";
import type { WCStatus } from "@/lib/execution/webcontainer-manager";
import { buildStaticPreviewDoc } from "@/lib/execution/static-preview";
import {
  Monitor,
  TerminalSquare,
  Play,
  RotateCw,
  Loader2,
  RefreshCw,
  ExternalLink,
  Zap,
} from "lucide-react";

interface PreviewPanelProps {
  files: FileMap;
  terminal: string[];
  status: WCStatus;
  previewUrl: string | null;
  supported: boolean;
  embedded: boolean;
  onStart: () => void;
  onRetryIsolation: () => void;
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
  embedded,
  onStart,
  onRetryIsolation,
  headerActions,
}: PreviewPanelProps) {
  const [tab, setTab] = useState<"preview" | "terminal">("preview");
  const [iframeKey, setIframeKey] = useState(0);
  // The workspace's own top-level URL. Opening it in a real new tab (via an
  // <a target="_blank">, which works even when window.open is blocked inside the
  // embedded preview iframe) gives a cross-origin-isolated tab that can run the
  // live sandbox.
  const [selfUrl, setSelfUrl] = useState("");
  useEffect(() => {
    setSelfUrl(window.location.href);
  }, []);
  const fileCount = Object.keys(files).length;

  const isWorking =
    status === "booting" || status === "installing" || status === "starting";

  // When the live sandbox can't run (no cross-origin isolation), fall back to a
  // client-only static render of the project so the pane still shows the app.
  const staticDoc = useMemo(
    () => (!supported ? buildStaticPreviewDoc(files) : null),
    [supported, files],
  );

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
          {supported && status !== "idle" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isWorking && <Loader2 className="h-3 w-3 animate-spin" />}
              {STATUS_LABEL[status]}
            </span>
          )}
          {(previewUrl || (!supported && staticDoc)) && (
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
        <div className="relative flex flex-1 flex-col">
          {previewUrl ? (
            <iframe
              key={iframeKey}
              src={previewUrl}
              title="App preview"
              className="h-full w-full border-0 bg-white"
              allow="cross-origin-isolated"
            />
          ) : !supported && staticDoc ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">
                  Static preview — open a full tab for the live sandbox.
                </span>
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="h-6 shrink-0 gap-1 px-2 text-xs"
                >
                  <a href={selfUrl || "#"} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    Full tab
                  </a>
                </Button>
              </div>
              <iframe
                key={iframeKey}
                srcDoc={staticDoc}
                title="Static app preview"
                sandbox="allow-scripts allow-popups allow-modals allow-forms allow-pointer-lock"
                className="h-full w-full flex-1 border-0 bg-white"
              />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              {!supported ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Live preview runs in a full tab</p>
                  <p className="max-w-sm text-balance text-xs leading-relaxed text-muted-foreground">
                    The in-browser sandbox needs a cross-origin-isolated tab, which the
                    embedded preview can&apos;t provide. Open this workspace in a full
                    browser tab to run it. The agent can still generate and edit all{" "}
                    {fileCount} file{fileCount === 1 ? "" : "s"} here.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button asChild>
                      <a href={selfUrl || "#"} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Open full tab
                      </a>
                    </Button>
                    <Button variant="outline" onClick={onRetryIsolation}>
                      <RefreshCw className="h-4 w-4" />
                      Retry
                    </Button>
                  </div>
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
