import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listSnapshots,
  createSnapshot,
  getSnapshot,
  deleteSnapshot,
  replaceProjectFiles,
} from "@/lib/projects.functions";
import type { FileMap } from "@/lib/execution/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function VersionHistory({
  projectId,
  getFiles,
  onRestore,
}: {
  projectId: string;
  getFiles: () => FileMap;
  onRestore: (files: FileMap) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const listFn = useServerFn(listSnapshots);
  const createFn = useServerFn(createSnapshot);
  const getFn = useServerFn(getSnapshot);
  const deleteFn = useServerFn(deleteSnapshot);
  const replaceFn = useServerFn(replaceProjectFiles);

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["snapshots", projectId],
    queryFn: () => listFn({ data: { projectId } }),
    enabled: open,
  });

  function filesToArray(): { path: string; content: string }[] {
    return Object.entries(getFiles()).map(([path, content]) => ({ path, content }));
  }

  async function saveVersion() {
    setBusy(true);
    try {
      const label = `Saved ${new Date().toLocaleString()}`;
      await createFn({ data: { projectId, label, files: filesToArray() } });
      qc.invalidateQueries({ queryKey: ["snapshots", projectId] });
      toast.success("Version saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save version");
    } finally {
      setBusy(false);
    }
  }

  async function restore(snapshotId: string) {
    setBusy(true);
    try {
      const snap = await getFn({ data: { snapshotId } });
      const fileMap: FileMap = Object.fromEntries(snap.files.map((f) => [f.path, f.content]));
      await replaceFn({ data: { projectId, files: snap.files } });
      onRestore(fileMap);
      toast.success("Restored this version");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore");
    } finally {
      setBusy(false);
    }
  }

  async function remove(snapshotId: string) {
    try {
      await deleteFn({ data: { snapshotId } });
      qc.invalidateQueries({ queryKey: ["snapshots", projectId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-[360px] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle>Version history</SheetTitle>
        </SheetHeader>

        <div className="border-b border-border p-3">
          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={saveVersion}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save current version
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !snapshots || snapshots.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No saved versions yet. Versions are captured automatically after each
                build, or save one manually above.
              </p>
            ) : (
              <ul className="space-y-2">
                {snapshots.map((s) => (
                  <li
                    key={s.id}
                    className="group flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Restore"
                        disabled={busy}
                        onClick={() => restore(s.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        title="Delete"
                        onClick={() => remove(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
