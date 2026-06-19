import { useEffect, useMemo, useRef, useState } from "react";
import type { FileMap } from "@/lib/execution/types";
import type { WCStatus, WebContainerManager } from "@/lib/execution/webcontainer-manager";
import { buildStaticPreviewDoc } from "@/lib/execution/static-preview";
import { Loader2, Play, Zap, ExternalLink } from "lucide-react";

const STATUS_LABEL: Record<WCStatus, string> = {
  idle: "Idle",
  booting: "Booting sandbox…",
  installing: "Installing dependencies…",
  starting: "Starting dev server…",
  ready: "Running",
  error: "Error",
};

/**
 * Self-contained, read-only live preview. Boots the in-browser WebContainer for
 * a given file map and renders the running app in an iframe. Used by the public
 * /p/:projectId share page.
 *
 * When the page is not cross-origin isolated (the sandbox can't run), it falls
 * back to a client-only static render so the shared link still shows the app.
 */
export function LivePreview({ files, autoStart = true }: { files: FileMap; autoStart?: boolean }) {
  const [status, setStatus] = useState<WCStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [checked, setChecked] = useState(false);
  const managerRef = useRef<WebContainerManager | null>(null);
  const startedRef = useRef(false);

  const staticDoc = useMemo(() => buildStaticPreviewDoc(files), [files]);

  async function start() {
    if (startedRef.current) return;
    startedRef.current = true;
    const m = await import("@/lib/execution/webcontainer-manager");
    managerRef.current = m.getWebContainerManager();
    managerRef.current.start(files, {
      onStatus: (s) => setStatus(s),
      onServerReady: (url) => setPreviewUrl(url),
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Ensure the page is cross-origin isolated (may reload once on first run).
      const { registerCoiServiceWorker } = await import(
        "@/lib/execution/coi-service-worker"
      );
      await registerCoiServiceWorker();
      if (cancelled) return;

      const m = await import("@/lib/execution/webcontainer-manager");
      if (cancelled) return;
      const ok = m.WebContainerManager.isSupported();
      setSupported(ok);
      setChecked(true);
      if (ok && autoStart) void start();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (previewUrl) {
    return (
      <iframe
        src={previewUrl}
        title="App preview"
        className="h-full w-full border-0 bg-white"
        allow="cross-origin-isolated"
      />
    );
  }

  // Live sandbox unavailable here → render the static fallback when possible.
  if (checked && !supported && staticDoc) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">
            Static preview of this app.
          </span>
          <a
            href={window.location.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted"
          >
            <ExternalLink className="h-3 w-3" />
            Full tab
          </a>
        </div>
        <iframe
          srcDoc={staticDoc}
          title="Static app preview"
          sandbox="allow-scripts allow-popups allow-modals allow-forms allow-pointer-lock"
          className="h-full w-full flex-1 border-0 bg-white"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      {!checked ? (
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      ) : !supported ? (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium">Preview runs in a full tab</p>
          <p className="max-w-xs text-balance text-xs text-muted-foreground">
            This app runs entirely in your browser and needs a cross-origin-isolated
            tab. Open it in a full browser tab to view it.
          </p>
          <a
            href={window.location.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Open full tab
          </a>
        </>
      ) : status === "idle" ? (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Play className="h-6 w-6 text-primary" />
          </div>
          <button
            onClick={() => void start()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Run app
          </button>
        </>
      ) : (
        <>
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm font-medium">{STATUS_LABEL[status]}</p>
        </>
      )}
    </div>
  );
}
