import { useEffect, useRef, useState } from "react";
import type { FileMap } from "@/lib/execution/types";
import type { WCStatus, WebContainerManager } from "@/lib/execution/webcontainer-manager";
import { Loader2, AlertTriangle, Play } from "lucide-react";

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
 */
export function LivePreview({ files, autoStart = true }: { files: FileMap; autoStart?: boolean }) {
  const [status, setStatus] = useState<WCStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const managerRef = useRef<WebContainerManager | null>(null);
  const startedRef = useRef(false);

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
    import("@/lib/execution/webcontainer-manager").then((m) => {
      if (cancelled) return;
      const ok = m.WebContainerManager.isSupported();
      setSupported(ok);
      if (ok && autoStart) void start();
    });
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

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      {!supported ? (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-sm font-medium">Live preview needs a supported browser</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            This shared app runs entirely in your browser and needs cross-origin
            isolation, which is available on the published site in a modern browser.
          </p>
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
