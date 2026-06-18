import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Monitor, Code2, Download, Loader2 } from "lucide-react";
import { PreviewPanel } from "./preview-panel";
import { EditorPanel } from "./editor-panel";
import type { FileMap } from "@/lib/execution/types";
import type { WCStatus } from "@/lib/execution/webcontainer-manager";

interface WorkspacePanelProps {
  files: FileMap;
  terminal: string[];
  status: WCStatus;
  previewUrl: string | null;
  supported: boolean;
  onStart: () => void;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onSave: (path: string, content: string) => void;
  onExport: () => void;
  exporting: boolean;
}

export function WorkspacePanel(props: WorkspacePanelProps) {
  const [view, setView] = useState<"preview" | "code">("preview");

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setView("preview")}>
          <Monitor className="mr-2 h-4 w-4" /> Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setView("code")}>
          <Code2 className="mr-2 h-4 w-4" /> Code &amp; files
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={props.onExport} disabled={props.exporting}>
          {props.exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export as ZIP
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (view === "code") {
    return (
      <div className="flex h-full flex-col bg-card">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
          <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Code</span>
          <div className="ml-auto">{menu}</div>
        </div>
        <div className="min-h-0 flex-1">
          <EditorPanel
            files={props.files}
            selectedPath={props.selectedPath}
            onSelect={props.onSelect}
            onCreateFile={props.onCreateFile}
            onDeleteFile={props.onDeleteFile}
            onRenameFile={props.onRenameFile}
            onSave={props.onSave}
          />
        </div>
      </div>
    );
  }

  return (
    <PreviewPanel
      files={props.files}
      terminal={props.terminal}
      status={props.status}
      previewUrl={props.previewUrl}
      supported={props.supported}
      onStart={props.onStart}
      headerActions={menu}
    />
  );
}
