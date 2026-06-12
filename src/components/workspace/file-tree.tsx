import { useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  FilePlus,
  Trash2,
  Pencil,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FileMap } from "@/lib/execution/types";

interface FileTreeProps {
  files: FileMap;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };
  for (const full of paths) {
    const parts = full.split("/").filter(Boolean);
    let node = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      let child = node.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, path, isDir: !isFile, children: [] };
        node.children.push(child);
      }
      node = child;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sort(n.children));
  };
  sort(root.children);
  return root.children;
}

function fileIcon(name: string) {
  return /\.(tsx?|jsx?|css|html|json|mjs|cjs)$/.test(name) ? FileCode : FileText;
}

export function FileTree({
  files,
  selectedPath,
  onSelect,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: FileTreeProps) {
  const paths = useMemo(() => Object.keys(files), [files]);
  const tree = useMemo(() => buildTree(paths), [paths]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  function submitCreate() {
    const path = newName.trim().replace(/^\/+/, "");
    if (path && !files[path]) onCreateFile(path);
    setNewName("");
    setCreating(false);
  }

  function submitRename() {
    if (!renaming) return;
    const next = renameValue.trim().replace(/^\/+/, "");
    if (next && next !== renaming && !files[next]) onRenameFile(renaming, next);
    setRenaming(null);
    setRenameValue("");
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Folder className="h-3.5 w-3.5" /> Files
        </span>
        <button
          onClick={() => {
            setCreating(true);
            setNewName("");
          }}
          title="New file"
          className="rounded p-1 hover:bg-muted hover:text-foreground"
        >
          <FilePlus className="h-3.5 w-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5">
          {creating && (
            <div className="px-1 pb-1">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                onBlur={submitCreate}
                placeholder="src/NewFile.tsx"
                className="h-7 text-xs"
              />
            </div>
          )}

          {paths.length === 0 && !creating ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No files yet.
            </p>
          ) : (
            tree.map((node) => (
              <TreeItem
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selectedPath}
                onSelect={onSelect}
                renaming={renaming}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                startRename={(p) => {
                  setRenaming(p);
                  setRenameValue(p);
                }}
                submitRename={submitRename}
                cancelRename={() => setRenaming(null)}
                onDelete={(p) => setPendingDelete(p)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{pendingDelete}</span> will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) onDeleteFile(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  renaming,
  renameValue,
  setRenameValue,
  startRename,
  submitRename,
  cancelRename,
  onDelete,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  renaming: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  startRename: (path: string) => void;
  submitRename: () => void;
  cancelRename: () => void;
  onDelete: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={pad}
          className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
        >
          {open ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          {open ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              renaming={renaming}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              startRename={startRename}
              submitRename={submitRename}
              cancelRename={cancelRename}
              onDelete={onDelete}
            />
          ))}
      </div>
    );
  }

  const Icon = fileIcon(node.name);
  const isSel = node.path === selectedPath;

  if (renaming === node.path) {
    return (
      <div style={pad} className="px-1 py-0.5">
        <Input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitRename();
            if (e.key === "Escape") cancelRename();
          }}
          onBlur={submitRename}
          className="h-7 text-xs"
        />
      </div>
    );
  }

  return (
    <div
      style={pad}
      className={`group flex items-center gap-1.5 rounded pr-1 text-xs transition-colors ${
        isSel ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <button
        onClick={() => onSelect(node.path)}
        className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
        title={node.path}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <span className="truncate">{node.name}</span>
      </button>
      <button
        onClick={() => startRename(node.path)}
        title="Rename"
        className="shrink-0 rounded p-0.5 opacity-0 hover:bg-background group-hover:opacity-100"
      >
        <Pencil className="h-3 w-3" />
      </button>
      <button
        onClick={() => onDelete(node.path)}
        title="Delete"
        className="shrink-0 rounded p-0.5 opacity-0 hover:bg-background group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
