import { useMemo, useState } from "react";
import type { FileMap } from "@/lib/execution/types";
import { buildStaticPreviewDoc } from "@/lib/execution/static-preview";
import { FileQuestion } from "lucide-react";

/**
 * Self-contained, read-only live preview for the public share / publish page.
 *
 * It renders the generated app with the client-only static renderer, which
 * works in any tab (no cross-origin isolation, no WebContainer, no npm install).
 * This is what makes a shared/published link actually show the app instead of a
 * blank screen.
 */
export function LivePreview({ files }: { files: FileMap; autoStart?: boolean }) {
  const [iframeKey] = useState(0);
  const staticDoc = useMemo(() => buildStaticPreviewDoc(files), [files]);

  if (!staticDoc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <FileQuestion className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Nothing to preview yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          This app doesn&apos;t have a recognizable web entry point to render.
        </p>
      </div>
    );
  }

  return (
    <iframe
      key={iframeKey}
      srcDoc={staticDoc}
      title="App preview"
      sandbox="allow-scripts allow-popups allow-modals allow-forms allow-pointer-lock"
      className="h-full w-full border-0 bg-white"
    />
  );
}
