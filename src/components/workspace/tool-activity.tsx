import {
  FilePlus,
  FilePen,
  FileX,
  FileText,
  FileSymlink,
  FolderTree,
  Search,
  ScanSearch,
  Package,
  TerminalSquare,
  ListChecks,
  ListTodo,
  ClipboardList,
  Rocket,
  Loader2,
  Check,
  X,
  Circle,
  CheckCircle2,
} from "lucide-react";
import { MarkdownMessage } from "./markdown-message";

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
  rename_file: { label: "Rename file", icon: FileSymlink },
  read_file: { label: "Read file", icon: FileText },
  list_files: { label: "List files", icon: FolderTree },
  grep: { label: "Search", icon: Search },
  code_search: { label: "Code search", icon: ScanSearch },
  add_dependency: { label: "Add dependency", icon: Package },
  run_command: { label: "Run command", icon: TerminalSquare },
  set_chat_summary: { label: "Summary", icon: ListChecks },
  update_todos: { label: "Plan", icon: ListTodo },
  write_plan: { label: "Implementation plan", icon: ClipboardList },
  exit_plan: { label: "Start building", icon: Rocket },
};

interface TodoItem {
  text: string;
  done: boolean;
}

export function ToolActivity({ part }: { part: ToolPart }) {
  const toolName = part.type.replace(/^tool-/, "");
  const input = (part.input ?? {}) as Record<string, unknown>;

  if (toolName === "update_todos" && Array.isArray(input.todos)) {
    return <TodoList todos={input.todos as TodoItem[]} />;
  }

  if (toolName === "write_plan" && typeof input.plan === "string") {
    return (
      <PlanCard title={typeof input.title === "string" ? input.title : "Plan"} plan={input.plan} />
    );
  }

  const meta = TOOL_META[toolName] ?? { label: toolName, icon: TerminalSquare };
  const Icon = meta.icon;

  const detail =
    typeof input.path === "string"
      ? input.path
      : typeof input.from === "string"
        ? `${input.from} → ${String(input.to ?? "")}`
        : typeof input.command === "string"
          ? input.command
          : typeof input.pattern === "string"
            ? input.pattern
            : typeof input.query === "string"
              ? input.query
              : Array.isArray(input.packages)
                ? (input.packages as string[]).join(", ")
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

function TodoList({ todos }: { todos: TodoItem[] }) {
  if (todos.length === 0) return null;
  return (
    <div className="my-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs">
      <div className="mb-1.5 flex items-center gap-1.5 font-medium">
        <ListTodo className="h-3.5 w-3.5 text-primary" /> Plan
      </div>
      <ul className="flex flex-col gap-1">
        {todos.map((t, i) => (
          <li key={i} className="flex items-start gap-1.5">
            {t.done ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
            ) : (
              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className={t.done ? "text-muted-foreground line-through" : ""}>{t.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanCard({ title, plan }: { title: string; plan: string }) {
  return (
    <div className="my-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 text-xs">
      <div className="mb-1.5 flex items-center gap-1.5 font-medium text-primary">
        <ClipboardList className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="text-foreground">
        <MarkdownMessage content={plan} />
      </div>
    </div>
  );
}
