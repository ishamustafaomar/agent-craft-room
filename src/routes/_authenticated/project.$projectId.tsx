import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { UIMessage } from "ai";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { getProject, touchProject, createSnapshot } from "@/lib/projects.functions";
import { createWorkspaceRuntime } from "@/lib/execution/workspace-runtime";
import type { FileMap } from "@/lib/execution/types";
import type {
  WCStatus,
  WebContainerManager,
} from "@/lib/execution/webcontainer-manager";
import { ChatPanel } from "@/components/workspace/chat-panel";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";
import { DEFAULT_MODEL, isValidModel } from "@/lib/agent/models";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ShareDialog } from "@/components/workspace/share-dialog";
import { VersionHistory } from "@/components/workspace/version-history";
import { GithubExport } from "@/components/workspace/github-export";
import { PresenceBar } from "@/components/workspace/presence-bar";

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  head: () => ({
    meta: [
      { title: "Workspace · Breezy" },
      { name: "description", content: "Build and iterate on your app with Breezy's AI-powered workspace." },
      { property: "og:title", content: "Workspace · Breezy" },
      { property: "og:description", content: "Build and iterate on your app with Breezy's AI-powered workspace." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
  }),
  component: Workspace,
});



function Workspace() {
  const { projectId } = useParams({ from: "/_authenticated/project/$projectId" });
  const { prompt } = useSearch({ from: "/_authenticated/project/$projectId" });
  const getProjectFn = useServerFn(getProject);
  const touchProjectFn = useServerFn(touchProject);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectFn({ data: { projectId } }),
  });

  // Mark this project as most-recently-opened for dashboard ordering.
  useEffect(() => {
    touchProjectFn({ data: { projectId } }).catch(() => {});
  }, [projectId, touchProjectFn]);


  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-muted-foreground">Could not load this project.</p>
        <Link to="/dashboard" className="text-sm text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const initialMessages = data.messages.map(
    (m): UIMessage => ({
      id: m.message_id || m.id,
      role: m.role as UIMessage["role"],
      parts: (m.parts as UIMessage["parts"]) ?? [],
    }),
  );

  return (
    <WorkspaceInner
      projectId={projectId}
      projectName={data.project.name}
      template={data.project.template}
      initialPublic={data.project.is_public ?? false}
      initialFiles={Object.fromEntries(data.files.map((f) => [f.path, f.content]))}
      initialMessages={initialMessages}
      // Only auto-run the prompt for a brand-new project with no history yet.
      initialPrompt={initialMessages.length === 0 ? prompt : undefined}
    />
  );
}

function WorkspaceInner({
  projectId,
  projectName,
  template,
  initialPublic,
  initialFiles,
  initialMessages,
  initialPrompt,
}: {
  projectId: string;
  projectName: string;
  template: string;
  initialPublic: boolean;
  initialFiles: FileMap;
  initialMessages: UIMessage[];
  initialPrompt?: string;
}) {
  const [files, setFiles] = useState<FileMap>(initialFiles);
  const [selectedPath, setSelectedPath] = useState<string | null>(
    Object.keys(initialFiles).sort()[0] ?? null,
  );
  const [terminal, setTerminal] = useState<string[]>([]);
  const [wcStatus, setWcStatus] = useState<WCStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Per-project agent mode (build/plan), persisted in the browser.
  const modeStorageKey = `forge:mode:${projectId}`;
  const [agentMode, setAgentMode] = useState<"build" | "ask" | "plan">(() => {
    if (typeof window === "undefined") return "build";
    const saved = window.localStorage.getItem(modeStorageKey);
    return saved === "plan" ? "plan" : "build";
  });

  function handleModeChange(next: "build" | "ask" | "plan") {
    setAgentMode(next);
    try {
      window.localStorage.setItem(modeStorageKey, next);
    } catch {
      /* ignore storage failures */
    }
  }

  // Per-project model selection, persisted in the browser.
  const modelStorageKey = `forge:model:${projectId}`;
  const [model, setModel] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_MODEL;
    const saved = window.localStorage.getItem(modelStorageKey);
    return saved && isValidModel(saved) ? saved : DEFAULT_MODEL;
  });

  function handleModelChange(next: string) {
    setModel(next);
    try {
      window.localStorage.setItem(modelStorageKey, next);
    } catch {
      /* ignore storage failures */
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const [path, content] of Object.entries(filesRef.current)) {
        zip.file(path, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "project"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }


  const filesRef = useRef<FileMap>(initialFiles);
  filesRef.current = files;

  const managerRef = useRef<WebContainerManager | null>(null);

  const appendTerminal = (chunk: string) =>
    setTerminal((t) => [...t.slice(-400), chunk]);

  // Lazily load the WebContainer manager on the client only (it touches browser
  // globals and must never run during SSR).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { isEmbeddedDocument, registerCoiServiceWorker } = await import(
        "@/lib/execution/coi-service-worker"
      );
      if (!cancelled) setEmbedded(isEmbeddedDocument());
      await registerCoiServiceWorker();
      if (cancelled) return;
      const m = await import("@/lib/execution/webcontainer-manager");
      if (cancelled) return;
      managerRef.current = m.getWebContainerManager();
      setSupported(m.WebContainerManager.isSupported());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRetryIsolation() {
    const { retryCoiIsolation } = await import("@/lib/execution/coi-service-worker");
    await retryCoiIsolation();
  }

  async function handleStart() {
    setTerminal([]);
    setPreviewUrl(null);
    if (!managerRef.current) {
      const m = await import("@/lib/execution/webcontainer-manager");
      managerRef.current = m.getWebContainerManager();
    }
    managerRef.current.start(filesRef.current, {
      onOutput: appendTerminal,
      onStatus: (s) => setWcStatus(s),
      onServerReady: (url) => setPreviewUrl(url),
    });
  }

  const runtime = useMemo(
    () =>
      createWorkspaceRuntime(
        projectId,
        filesRef,
        (next) => {
          setFiles(next);
          setSelectedPath((cur) => cur ?? Object.keys(next).sort()[0] ?? null);
        },
        () => managerRef.current,
        appendTerminal,
      ),
    [projectId],
  );

  function handleCreateFile(path: string) {
    runtime.writeFile(path, "");
    setSelectedPath(path);
  }

  function handleDeleteFile(path: string) {
    runtime.deleteFile(path);
    setSelectedPath((cur) => (cur === path ? null : cur));
  }

  function handleRenameFile(oldPath: string, newPath: string) {
    const content = filesRef.current[oldPath] ?? "";
    runtime.writeFile(newPath, content);
    runtime.deleteFile(oldPath);
    setSelectedPath(newPath);
  }

  function handleSaveFile(path: string, content: string) {
    runtime.writeFile(path, content);
  }

  // Restore a snapshot: swap in-memory files (DB already updated by the caller).
  function handleRestoreFiles(next: FileMap) {
    filesRef.current = next;
    setFiles(next);
    setSelectedPath(Object.keys(next).sort()[0] ?? null);
  }

  // Auto-capture a version when an agent build turn settles (skips no-op turns).
  const createSnapshotFn = useServerFn(createSnapshot);
  const lastSnapSig = useRef<string>("");
  const handleTurnSettled = useCallback(() => {
    const current = filesRef.current;
    const sig = Object.keys(current)
      .sort()
      .map((k) => `${k}:${current[k].length}`)
      .join("|");
    if (sig === lastSnapSig.current) return;
    lastSnapSig.current = sig;
    const files = Object.entries(current).map(([path, content]) => ({ path, content }));
    createSnapshotFn({
      data: { projectId, label: `Build · ${new Date().toLocaleString()}`, files },
    }).catch(() => {});
  }, [projectId, createSnapshotFn]);





  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-3 backdrop-blur sm:px-4">
        <Link
          to="/dashboard"
          className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <BrandLogo size={18} showWordmark={false} />
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{projectName}</span>
          <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline">
            {template}
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden md:block">
            <PresenceBar projectId={projectId} />
          </div>
          <div className="hidden items-center gap-1.5 sm:gap-2 lg:flex">
            <GithubExport
              getFiles={() => filesRef.current}
              defaultRepo={projectName.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "breezy-app"}
            />
          </div>
          <ShareDialog projectId={projectId} initialPublic={initialPublic} />
        </div>
      </header>


      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={38} minSize={26}>
          <ChatPanel
            projectId={projectId}
            projectName={projectName}
            template={template}
            model={model}
            onModelChange={handleModelChange}
            mode={agentMode}
            onModeChange={handleModeChange}
            runtime={runtime}
            initialMessages={initialMessages}
            initialPrompt={initialPrompt}
            getFileTree={() => Object.keys(filesRef.current).sort().join("\n")}
            getAiRules={() => filesRef.current["AI_RULES.md"] ?? ""}
            onExitPlan={() => handleModeChange("build")}
            onCommandOutput={appendTerminal}
            onTurnSettled={handleTurnSettled}
            headerActions={
              <VersionHistory
                projectId={projectId}
                getFiles={() => filesRef.current}
                onRestore={handleRestoreFiles}
              />
            }
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={62} minSize={30}>
          <WorkspacePanel
            files={files}
            terminal={terminal}
            status={wcStatus}
            previewUrl={previewUrl}
            supported={supported}
            embedded={embedded}
            onStart={handleStart}
            onRetryIsolation={handleRetryIsolation}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onSave={handleSaveFile}
            onExport={handleExport}
            exporting={exporting}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

    </div>
  );
}
