import {
  FilePlus,
  FilePen,
  FileX,
  FileText,
  FolderTree,
  TerminalSquare,
  ListChecks,
  Loader2,
  Check,
  X,
} from "lucide-react";

interface ToolPart {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

const TOOL_META: Record<string, { label: string; icon: typeof FileText }> = {
  write_file: { label: "Write file", icon: FilePlus },
  edit_file: { label: "Edit file", icon: FilePen },
  delete_file: { label: "Delete file", icon: FileX },
  read_file: { label: "Read file", icon: FileText },
  list_files: { label: "List files", icon: FolderTree },
  run_command: { label: "Run command", icon: TerminalSquare },
  set_chat_summary: { label: "Summary", icon: ListChecks },
};

export function ToolActivity({ part }: { part: ToolPart }) {
  const toolName = part.type.replace(/^tool-/, "");
  const meta = TOOL_META[toolName] ?? { label: toolName, icon: TerminalSquare };
  const Icon = meta.icon;
  const input = (part.input ?? {}) as Record<string, unknown>;

  const detail =
    typeof input.path === "string"
      ? input.path
      : typeof input.command === "string"
        ? input.command
        : typeof input.summary === "string"
          ? input.summary
          : "";

  const isRunning = part.state === "input-streaming" || part.state === "input-available";
  const isError = part.state === "output-error";

  return (
    <div className="my-1.5 flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5 text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="font-medium">{meta.label}</span>
      {detail && (
        <span className="truncate font-mono text-muted-foreground" title={detail}>
          {detail}
        </span>
      )}
      <span className="ml-auto shrink-0">
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : isError ? (
          <X className="h-3.5 w-3.5 text-destructive" />
        ) : (
          <Check className="h-3.5 w-3.5 text-green-500" />
        )}
      </span>
    </div>
  );
}
