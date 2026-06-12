import type { Runtime } from "./types";

export interface ToolExecutionContext {
  runtime: Runtime;
  onCommandOutput?: (chunk: string) => void;
  onSummary?: (summary: string) => void;
}

// Executes a single agent tool call against the runtime and returns a
// compact, serializable result the model can read.
export async function executeAgentTool(
  toolName: string,
  input: unknown,
  ctx: ToolExecutionContext,
): Promise<unknown> {
  const args = (input ?? {}) as Record<string, unknown>;
  const { runtime } = ctx;

  switch (toolName) {
    case "set_chat_summary": {
      const summary = String(args.summary ?? "").slice(0, 80);
      ctx.onSummary?.(summary);
      return { ok: true };
    }
    case "list_files": {
      return { files: runtime.listFiles() };
    }
    case "read_file": {
      const path = String(args.path ?? "");
      const content = runtime.readFile(path);
      if (content === undefined) return { error: `File not found: ${path}` };
      return { path, content };
    }
    case "write_file": {
      const path = String(args.path ?? "");
      const content = String(args.content ?? "");
      if (!path) return { error: "Missing path" };
      await runtime.writeFile(path, content);
      return { ok: true, path, bytes: content.length };
    }
    case "edit_file": {
      const path = String(args.path ?? "");
      const search = String(args.search ?? "");
      const replace = String(args.replace ?? "");
      const current = runtime.readFile(path);
      if (current === undefined) return { error: `File not found: ${path}` };
      if (!current.includes(search)) {
        return { error: `Search text not found in ${path}.` };
      }
      const next = current.replace(search, replace);
      await runtime.writeFile(path, next);
      return { ok: true, path };
    }
    case "delete_file": {
      const path = String(args.path ?? "");
      if (runtime.readFile(path) === undefined) {
        return { error: `File not found: ${path}` };
      }
      await runtime.deleteFile(path);
      return { ok: true, path };
    }
    case "run_command": {
      const command = String(args.command ?? "");
      if (!command) return { error: "Missing command" };
      const result = await runtime.runCommand(command, ctx.onCommandOutput);
      return {
        command,
        exitCode: result.exitCode,
        output: result.output.slice(0, 8000),
      };
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
