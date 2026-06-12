import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FileTree } from "./file-tree";
import { CodeEditor } from "./code-editor";
import type { FileMap } from "@/lib/execution/types";

interface EditorPanelProps {
  files: FileMap;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onSave: (path: string, content: string) => void;
}

export function EditorPanel({
  files,
  selectedPath,
  onSelect,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onSave,
}: EditorPanelProps) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize={32} minSize={18} maxSize={45}>
        <FileTree
          files={files}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onCreateFile={onCreateFile}
          onDeleteFile={onDeleteFile}
          onRenameFile={onRenameFile}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={68} minSize={40}>
        <CodeEditor
          files={files}
          selectedPath={selectedPath}
          onSelectPath={onSelect}
          onSave={onSave}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
