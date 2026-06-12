import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { UIMessage } from "ai";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { getProject } from "@/lib/projects.functions";
import { createWorkspaceRuntime } from "@/lib/execution/workspace-runtime";
import type { FileMap } from "@/lib/execution/types";
import type {
  WCStatus,
  WebContainerManager,
} from "@/lib/execution/webcontainer-manager";
import { ChatPanel } from "@/components/workspace/chat-panel";
import { FileExplorer } from "@/components/workspace/file-explorer";
import { PreviewPanel } from "@/components/workspace/preview-panel";
import { Sparkles, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  component: Workspace,
});

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

function Workspace() {
  const { projectId } = useParams({ from: "/_authenticated/project/$projectId" });
  const getProjectFn = useServerFn(getProject);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectFn({ data: { projectId } }),
  });

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

  return (
    <WorkspaceInner
      projectId={projectId}
      projectName={data.project.name}
      template={data.project.template}
      initialFiles={Object.fromEntries(data.files.map((f) => [f.path, f.content]))}
      initialMessages={data.messages.map(
        (m): UIMessage => ({
          id: m.message_id || m.id,
          role: m.role as UIMessage["role"],
          parts: (m.parts as UIMessage["parts"]) ?? [],
        }),
      )}
    />
  );
}

function WorkspaceInner({
  projectId,
  projectName,
  template,
  initialFiles,
  initialMessages,
}: {
  projectId: string;
  projectName: string;
  template: string;
  initialFiles: FileMap;
  initialMessages: UIMessage[];
}) {
  const [files, setFiles] = useState<FileMap>(initialFiles);
  const [selectedPath, setSelectedPath] = useState<string | null>(
    Object.keys(initialFiles).sort()[0] ?? null,
  );
  const [terminal, setTerminal] = useState<string[]>([]);
  const [wcStatus, setWcStatus] = useState<WCStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const filesRef = useRef<FileMap>(initialFiles);
  filesRef.current = files;

  const managerRef = useRef<WebContainerManager | null>(null);

  const appendTerminal = (chunk: string) =>
    setTerminal((t) => [...t.slice(-400), chunk]);

  // Lazily load the WebContainer manager on the client only (it touches browser
  // globals and must never run during SSR).
  useEffect(() => {
    let cancelled = false;
    import("@/lib/execution/webcontainer-manager").then((m) => {
      if (cancelled) return;
      managerRef.current = m.getWebContainerManager();
      setSupported(m.WebContainerManager.isSupported());
    });
    return () => {
      cancelled = true;
    };
  }, []);

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




  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{projectName}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {template}
        </span>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={32} minSize={22}>
          <ChatPanel
            projectId={projectId}
            projectName={projectName}
            template={template}
            model={DEFAULT_MODEL}
            runtime={runtime}
            initialMessages={initialMessages}
            getFileTree={() => Object.keys(filesRef.current).sort().join("\n")}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40} minSize={28}>
          <EditorPanel
            files={files}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onSave={handleSaveFile}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={28} minSize={18}>
          <PreviewPanel
            files={files}
            terminal={terminal}
            status={wcStatus}
            previewUrl={previewUrl}
            supported={supported}
            onStart={handleStart}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

    </div>
  );
}
