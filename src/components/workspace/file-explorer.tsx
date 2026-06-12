import { FileCode, FileText, Folder } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FileMap } from "@/lib/execution/types";

interface FileExplorerProps {
  files: FileMap;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function FileExplorer({ files, selectedPath, onSelect }: FileExplorerProps) {
  const paths = Object.keys(files).sort();
  const content = selectedPath ? files[selectedPath] : undefined;

  return (
    <div className="flex h-full bg-card">
      <div className="w-52 shrink-0 border-r border-border">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 text-xs font-medium text-muted-foreground">
          <Folder className="h-3.5 w-3.5" /> Files
        </div>
        <ScrollArea className="h-[calc(100%-37px)]">
          <div className="p-1.5">
            {paths.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No files yet.
              </p>
            ) : (
              paths.map((path) => {
                const isSel = path === selectedPath;
                const Icon = /\.(tsx?|jsx?|css|html|json)$/.test(path)
                  ? FileCode
                  : FileText;
                return (
                  <button
                    key={path}
                    onClick={() => onSelect(path)}
                    className={`flex w-full items-center gap-1.5 truncate rounded px-2 py-1 text-left text-xs transition-colors ${
                      isSel
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    title={path}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span className="truncate">{path}</span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border px-3 py-2.5 text-xs font-medium text-muted-foreground">
          {selectedPath ?? "No file selected"}
        </div>
        <ScrollArea className="flex-1">
          {content !== undefined ? (
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground">
              {content || "(empty file)"}
            </pre>
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
              Select a file to view its contents.
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
