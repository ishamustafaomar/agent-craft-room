import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  embedded: boolean;
  onStart: () => void;
  onRetryIsolation: () => void;
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

  // A visible Preview/Code switch — clearer than burying it in a menu.
  const viewToggle = <ViewToggle view={view} onChange={setView} />;

  const headerActions = (
    <div className="flex items-center gap-1.5">
      {viewToggle}
      {menu}
    </div>
  );

  if (view === "code") {
    return (
      <div className="flex h-full flex-col bg-card">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
          {headerActions}
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
      embedded={props.embedded}
      onStart={props.onStart}
      onRetryIsolation={props.onRetryIsolation}
      headerActions={headerActions}
    />
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "preview" | "code";
  onChange: (v: "preview" | "code") => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-background/60 p-0.5">
      <ToggleItem
        active={view === "preview"}
        onClick={() => onChange("preview")}
        icon={<Monitor className="h-3.5 w-3.5" />}
        label="Preview"
      />
      <ToggleItem
        active={view === "code"}
        onClick={() => onChange("code")}
        icon={<Code2 className="h-3.5 w-3.5" />}
        label="Code"
      />
    </div>
  );
}

function ToggleItem({
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
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
