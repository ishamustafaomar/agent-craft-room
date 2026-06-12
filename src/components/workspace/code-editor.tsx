import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { X, Circle, Save, Code2 } from "lucide-react";
import type { FileMap } from "@/lib/execution/types";

interface CodeEditorProps {
  files: FileMap;
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
  onSave: (path: string, content: string) => void;
}

function languageOf(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
      return "typescript";
    case "tsx":
      return "typescript";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

export function CodeEditor({
  files,
  selectedPath,
  onSelectPath,
  onSave,
}: CodeEditorProps) {
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const saveRef = useRef<() => void>(() => {});

  // Open a tab whenever a file is selected.
  useEffect(() => {
    if (selectedPath && files[selectedPath] !== undefined) {
      setOpenTabs((tabs) =>
        tabs.includes(selectedPath) ? tabs : [...tabs, selectedPath],
      );
    }
  }, [selectedPath, files]);

  // Drop tabs / drafts for files that no longer exist.
  useEffect(() => {
    setOpenTabs((tabs) => tabs.filter((t) => files[t] !== undefined));
    setDrafts((d) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(d)) if (files[k] !== undefined) next[k] = v;
      return next;
    });
  }, [files]);

  const active = selectedPath && files[selectedPath] !== undefined ? selectedPath : null;
  const value = active ? drafts[active] ?? files[active] : "";
  const isDirty = active ? drafts[active] !== undefined && drafts[active] !== files[active] : false;

  function handleSave() {
    if (!active) return;
    const content = drafts[active];
    if (content === undefined || content === files[active]) return;
    onSave(active, content);
    setDrafts((d) => {
      const next = { ...d };
      delete next[active];
      return next;
    });
  }
  saveRef.current = handleSave;

  function closeTab(path: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenTabs((tabs) => {
      const idx = tabs.indexOf(path);
      const next = tabs.filter((t) => t !== path);
      if (path === active) {
        const fallback = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
        if (fallback) onSelectPath(fallback);
      }
      return next;
    });
    setDrafts((d) => {
      const next = { ...d };
      delete next[path];
      return next;
    });
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-[#1e1e1e]">
      {/* Tab bar */}
      <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b border-border bg-card">
        {openTabs.length === 0 ? (
          <span className="px-3 text-xs text-muted-foreground">No file open</span>
        ) : (
          openTabs.map((path) => {
            const name = path.split("/").pop();
            const dirty = drafts[path] !== undefined && drafts[path] !== files[path];
            const isActive = path === active;
            return (
              <button
                key={path}
                onClick={() => onSelectPath(path)}
                className={`group flex h-full shrink-0 items-center gap-1.5 border-r border-border px-3 text-xs transition-colors ${
                  isActive
                    ? "bg-[#1e1e1e] text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
                title={path}
              >
                <span className="max-w-[160px] truncate">{name}</span>
                {dirty ? (
                  <Circle className="h-2 w-2 shrink-0 fill-current text-primary" />
                ) : null}
                <span
                  onClick={(e) => closeTab(path, e)}
                  className="rounded p-0.5 opacity-0 hover:bg-background group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            );
          })
        )}
        {isDirty && (
          <button
            onClick={handleSave}
            className="ml-auto mr-2 flex shrink-0 items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
            title="Save (Ctrl/Cmd+S)"
          >
            <Save className="h-3 w-3" /> Save
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="min-h-0 flex-1">
        {active ? (
          <Editor
            key={active}
            height="100%"
            theme="vs-dark"
            path={active}
            language={languageOf(active)}
            value={value}
            onChange={(v) =>
              setDrafts((d) => ({ ...d, [active]: v ?? "" }))
            }
            onMount={(editor, monaco) => {
              editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                () => saveRef.current(),
              );
            }}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 12 },
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Code2 className="h-8 w-8 opacity-40" />
            <p className="text-sm">Select a file to start editing</p>
          </div>
        )}
      </div>
    </div>
  );
}
