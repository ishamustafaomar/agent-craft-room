import type { Runtime } from "./types";

export interface ToolExecutionContext {
  runtime: Runtime;
  onCommandOutput?: (chunk: string) => void;
  onSummary?: (summary: string) => void;
  onExitPlan?: () => void;
}

const DESTRUCTIVE_COMMAND = /\brm\s+-rf\s+\/|\bmkfs|\b:\(\)\s*\{|\bdd\s+if=|\bshutdown\b|\breboot\b|>\s*\/dev\/sd/i;

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
    case "update_todos": {
      const todos = Array.isArray(args.todos) ? args.todos : [];
      return { ok: true, count: todos.length };
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
    case "grep": {
      const pattern = String(args.pattern ?? "");
      const include = args.include ? String(args.include) : undefined;
      if (!pattern) return { error: "Missing pattern" };
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, "i");
      } catch {
        // Fall back to literal substring search.
        regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      }
      const matches: { path: string; line: number; text: string }[] = [];
      for (const path of runtime.listFiles()) {
        if (include && !path.includes(include)) continue;
        const content = runtime.readFile(path);
        if (content === undefined) continue;
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push({ path, line: i + 1, text: lines[i].slice(0, 240).trim() });
            if (matches.length >= 100) break;
          }
        }
        if (matches.length >= 100) break;
      }
      return { matches, truncated: matches.length >= 100 };
    }
    case "code_search": {
      const query = String(args.query ?? "").toLowerCase();
      if (!query) return { error: "Missing query" };
      const terms = query.split(/\s+/).filter(Boolean);
      const scored: { path: string; score: number }[] = [];
      for (const path of runtime.listFiles()) {
        const content = (runtime.readFile(path) ?? "").toLowerCase();
        const lowerPath = path.toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (lowerPath.includes(t)) score += 5;
          const occurrences = content.split(t).length - 1;
          score += Math.min(occurrences, 10);
        }
        if (score > 0) scored.push({ path, score });
      }
      scored.sort((a, b) => b.score - a.score);
      return { files: scored.slice(0, 15).map((s) => s.path) };
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
        return { error: `Search text not found in ${path}. Read the file and try again, or use write_file.` };
      }
      const occurrences = current.split(search).length - 1;
      if (occurrences > 1) {
        return {
          error: `Search text matches ${occurrences} times in ${path}; it must match uniquely. Add more surrounding context.`,
        };
      }
      const next = current.replace(search, replace);
      await runtime.writeFile(path, next);
      return { ok: true, path };
    }
    case "rename_file": {
      const from = String(args.from ?? "");
      const to = String(args.to ?? "");
      if (!from || !to) return { error: "Missing from/to" };
      const content = runtime.readFile(from);
      if (content === undefined) return { error: `File not found: ${from}` };
      await runtime.writeFile(to, content);
      await runtime.deleteFile(from);
      return { ok: true, from, to };
    }
    case "delete_file": {
      const path = String(args.path ?? "");
      if (runtime.readFile(path) === undefined) {
        return { error: `File not found: ${path}` };
      }
      await runtime.deleteFile(path);
      return { ok: true, path };
    }
    case "add_dependency": {
      const packages = Array.isArray(args.packages)
        ? args.packages.map((p) => String(p))
        : [];
      const dev = Boolean(args.dev);
      if (packages.length === 0) return { error: "No packages provided" };
      const pkgRaw = runtime.readFile("package.json");
      if (pkgRaw === undefined) {
        return { error: "package.json not found. Create it with write_file first." };
      }
      let pkg: Record<string, unknown>;
      try {
        pkg = JSON.parse(pkgRaw);
      } catch {
        return { error: "package.json is not valid JSON." };
      }
      const field = dev ? "devDependencies" : "dependencies";
      const deps = (pkg[field] as Record<string, string>) ?? {};
      const added: string[] = [];
      for (const spec of packages) {
        const at = spec.lastIndexOf("@");
        const hasVersion = at > 0; // allow scoped @scope/name
        const name = hasVersion ? spec.slice(0, at) : spec;
        const version = hasVersion ? spec.slice(at + 1) : "latest";
        deps[name] = version;
        added.push(name);
      }
      pkg[field] = deps;
      await runtime.writeFile("package.json", JSON.stringify(pkg, null, 2) + "\n");
      const result = await runtime.runCommand("npm install", ctx.onCommandOutput);
      return { ok: true, added, exitCode: result.exitCode };
    }
    case "run_command": {
      const command = String(args.command ?? "");
      if (!command) return { error: "Missing command" };
      if (DESTRUCTIVE_COMMAND.test(command)) {
        return { error: "Refused: this command looks destructive and is not allowed." };
      }
      const result = await runtime.runCommand(command, ctx.onCommandOutput);
      return {
        command,
        exitCode: result.exitCode,
        output: result.output.slice(0, 8000),
      };
    }
    case "write_plan": {
      // Plan card is rendered from the tool part in the UI; nothing to execute.
      return { ok: true };
    }
    case "exit_plan": {
      if (args.confirmation) ctx.onExitPlan?.();
      return { ok: true };
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
