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
import { EditorPanel } from "@/components/workspace/editor-panel";
import { PreviewPanel } from "@/components/workspace/preview-panel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODEL_GROUPS, DEFAULT_MODEL, isValidModel } from "@/lib/agent/models";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Download } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ShareDialog } from "@/components/workspace/share-dialog";
import { VersionHistory } from "@/components/workspace/version-history";

export const Route = createFileRoute("/_authenticated/project/$projectId")({
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
  initialFiles,
  initialMessages,
  initialPrompt,
}: {
  projectId: string;
  projectName: string;
  template: string;
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
  const [exporting, setExporting] = useState(false);

  // Per-project agent mode (build/ask/plan), persisted in the browser.
  const modeStorageKey = `forge:mode:${projectId}`;
  const [agentMode, setAgentMode] = useState<"build" | "ask" | "plan">(() => {
    if (typeof window === "undefined") return "build";
    const saved = window.localStorage.getItem(modeStorageKey);
    return saved === "ask" || saved === "plan" ? saved : "build";
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
        <BrandLogo size={18} showWordmark={false} />
        <span className="text-sm font-medium">{projectName}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {template}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Select value={agentMode} onValueChange={handleModeChange}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="build" className="text-xs">Build</SelectItem>
              <SelectItem value="ask" className="text-xs">Ask</SelectItem>
              <SelectItem value="plan" className="text-xs">Plan</SelectItem>
            </SelectContent>
          </Select>
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_GROUPS.map((group) => (
                <SelectGroup key={group.provider}>
                  <SelectLabel>{group.provider}</SelectLabel>
                  {group.models.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export
          </Button>
        </div>
      </header>


      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={32} minSize={22}>
          <ChatPanel
            projectId={projectId}
            projectName={projectName}
            template={template}
            model={model}
            mode={agentMode}
            runtime={runtime}
            initialMessages={initialMessages}
            initialPrompt={initialPrompt}
            getFileTree={() => Object.keys(filesRef.current).sort().join("\n")}
            getAiRules={() => filesRef.current["AI_RULES.md"] ?? ""}
            onExitPlan={() => handleModeChange("build")}
            onCommandOutput={appendTerminal}
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
