// Agent tool definitions. These are "client-executed" tools: they are declared on
// the server (no `execute`), streamed to the browser, and run there against the
// project's virtual file system / WebContainer. The same Zod schemas type both sides.
import { tool } from "ai";
import { z } from "zod";

export const writeFileSchema = z.object({
  path: z.string().min(1).describe("Project-relative file path, e.g. src/App.tsx"),
  content: z.string().describe("Full file contents to write (overwrites existing)."),
});

export const editFileSchema = z.object({
  path: z.string().min(1).describe("Project-relative file path to edit."),
  search: z.string().min(1).describe("Exact existing text to replace."),
  replace: z.string().describe("Replacement text."),
});

export const deleteFileSchema = z.object({
  path: z.string().min(1).describe("Project-relative file path to delete."),
});

export const readFileSchema = z.object({
  path: z.string().min(1).describe("Project-relative file path to read."),
});

export const listFilesSchema = z.object({});

export const runCommandSchema = z.object({
  command: z.string().min(1).describe("Shell command to run, e.g. 'npm install'."),
});

export const setChatSummarySchema = z.object({
  summary: z.string().min(1).max(80).describe("A short title for this conversation turn."),
});

export const agentTools = {
  set_chat_summary: tool({
    description:
      "Set a short title summarizing what this turn is about. Call exactly once, early in the turn.",
    inputSchema: setChatSummarySchema,
  }),
  list_files: tool({
    description: "List all files currently in the project.",
    inputSchema: listFilesSchema,
  }),
  read_file: tool({
    description: "Read the full contents of a file in the project.",
    inputSchema: readFileSchema,
  }),
  write_file: tool({
    description:
      "Create a new file or overwrite an existing one with full contents. Use for new files or full rewrites.",
    inputSchema: writeFileSchema,
  }),
  edit_file: tool({
    description:
      "Make a targeted edit to an existing file by replacing an exact snippet of text.",
    inputSchema: editFileSchema,
  }),
  delete_file: tool({
    description: "Delete a file from the project.",
    inputSchema: deleteFileSchema,
  }),
  run_command: tool({
    description:
      "Run a shell command in the project sandbox (e.g. npm install, npm run build). Output is captured.",
    inputSchema: runCommandSchema,
  }),
} as const;

export type AgentToolName = keyof typeof agentTools;
