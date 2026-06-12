import type { Runtime, FileMap } from "./types";
import { upsertFile, deleteFile as deleteFileFn } from "@/lib/projects.functions";

// Stage 1 runtime: keeps an in-memory file map (mirrored to React state) and
// persists changes to the database. Shell commands are not actually executed yet
// (that arrives with the WebContainer runtime in Stage 2) — they are recorded.
export function createDbRuntime(
  projectId: string,
  filesRef: { current: FileMap },
  onChange: (files: FileMap) => void,
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
      await upsertFile({ data: { projectId, path, content } });
    },
    async deleteFile(path) {
      const next = { ...filesRef.current };
      delete next[path];
      commit(next);
      await deleteFileFn({ data: { projectId, path } });
    },
    async runCommand(command, onOutput) {
      const msg = `$ ${command}\n[queued] Live execution starts once the in-browser sandbox is enabled.`;
      onOutput?.(msg);
      return { output: msg, exitCode: 0 };
    },
  };
}
