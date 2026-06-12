import type { Runtime, FileMap } from "./types";
import { upsertFile, deleteFile as deleteFileFn } from "@/lib/projects.functions";
import type { WebContainerManager } from "./webcontainer-manager";

/**
 * Stage 2 runtime: the single source of truth the agent's tools run against.
 * - Keeps an in-memory file map mirrored to React state.
 * - Persists every change to the database.
 * - Mirrors writes into the live WebContainer (when booted) so the preview
 *   hot-reloads, and routes shell commands to the container.
 */
export function createWorkspaceRuntime(
  projectId: string,
  filesRef: { current: FileMap },
  onChange: (files: FileMap) => void,
  getManager: () => WebContainerManager,
  onCommandOutput?: (chunk: string) => void,
): Runtime {
  function commit(next: FileMap) {
    filesRef.current = next;
    onChange(next);
  }

  return {
    readFile(path) {
      return filesRef.current[path];
    },
    listFiles() {
      return Object.keys(filesRef.current).sort();
    },
    async writeFile(path, content) {
      commit({ ...filesRef.current, [path]: content });
      await Promise.all([
        upsertFile({ data: { projectId, path, content } }),
        getManager().writeFile(path, content),
      ]);
    },
    async deleteFile(path) {
      const next = { ...filesRef.current };
      delete next[path];
      commit(next);
      await Promise.all([
        deleteFileFn({ data: { projectId, path } }),
        getManager().deleteFile(path),
      ]);
    },
    async runCommand(command, onOutput) {
      const sink = (chunk: string) => {
        onOutput?.(chunk);
        onCommandOutput?.(chunk);
      };
      return getManager().runCommand(command, sink);
    },
  };
}
