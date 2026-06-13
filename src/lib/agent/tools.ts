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
  search: z.string().min(1).describe("Exact existing text to replace (must match uniquely)."),
  replace: z.string().describe("Replacement text."),
});

export const deleteFileSchema = z.object({
  path: z.string().min(1).describe("Project-relative file path to delete."),
});

export const renameFileSchema = z.object({
  from: z.string().min(1).describe("Existing project-relative file path."),
  to: z.string().min(1).describe("New project-relative file path."),
});

export const readFileSchema = z.object({
  path: z.string().min(1).describe("Project-relative file path to read."),
});

export const listFilesSchema = z.object({});

export const grepSchema = z.object({
  pattern: z.string().min(1).describe("Regular expression (or plain substring) to search for."),
  include: z
    .string()
    .optional()
    .describe("Optional path substring to limit which files are searched, e.g. 'src/'."),
});

export const codeSearchSchema = z.object({
  query: z.string().min(1).describe("Keywords to find relevant files by name and content."),
});

export const addDependencySchema = z.object({
  packages: z
    .array(z.string().min(1))
    .min(1)
    .describe("npm package names, optionally with versions, e.g. ['zustand', 'clsx@2']."),
  dev: z.boolean().optional().describe("Add to devDependencies instead of dependencies."),
});

export const runCommandSchema = z.object({
  command: z.string().min(1).describe("Shell command to run, e.g. 'npm install'."),
});

export const scaffoldBackendSchema = z.object({
  features: z
    .array(z.enum(["auth", "database"]))
    .min(1)
    .describe("Which capabilities to scaffold: 'auth' (login/signup) and/or 'database' (CRUD store)."),
});

export const setChatSummarySchema = z.object({
  summary: z.string().min(1).max(80).describe("A short title for this conversation turn."),
});

export const todoItemSchema = z.object({
  text: z.string().min(1).describe("Short description of the task."),
  done: z.boolean().describe("Whether this task is complete."),
});

export const updateTodosSchema = z.object({
  todos: z.array(todoItemSchema).describe("The full, current todo list for this turn."),
});

export const writePlanSchema = z.object({
  title: z.string().min(1).describe("A concise title for the implementation plan."),
  plan: z
    .string()
    .min(1)
    .describe("The full implementation plan as GitHub-flavored markdown."),
});

export const exitPlanSchema = z.object({
  confirmation: z.boolean().describe("Set true only after the user accepts the plan."),
});

export const writeAppBlueprintSchema = z.object({
  appName: z.string().min(1).describe("A creative, memorable name for the app."),
  designDirection: z
    .string()
    .min(1)
    .describe("A specific but concise (1-2 sentence) description of the visual design direction."),
  primaryColor: z
    .string()
    .min(1)
    .describe("A hex color that fits the industry and design direction, e.g. #4f46e5."),
  assets: z
    .array(
      z.object({
        name: z.string().min(1).describe("Short asset name, e.g. 'hero image'."),
        prompt: z.string().min(1).describe("Detailed image-generation prompt for this asset."),
      }),
    )
    .optional()
    .describe("Visual assets the app needs (logo, photography, illustrations, backgrounds)."),
});

const allTools = {
  set_chat_summary: tool({
    description:
      "Set a short title summarizing what this turn is about. Call exactly once, early in the turn.",
    inputSchema: setChatSummarySchema,
  }),
  update_todos: tool({
    description:
      "Set or update a structured todo list for a complex, multi-step task so the user can track progress. Send the full list each time, marking completed items done.",
    inputSchema: updateTodosSchema,
  }),
  list_files: tool({
    description: "List all files currently in the project.",
    inputSchema: listFilesSchema,
  }),
  read_file: tool({
    description: "Read the full contents of a file in the project.",
    inputSchema: readFileSchema,
  }),
  grep: tool({
    description:
      "Search the project for a regex or substring. Returns matching files with line numbers and snippets. Use this to locate code before editing.",
    inputSchema: grepSchema,
  }),
  code_search: tool({
    description:
      "Find the files most relevant to a set of keywords, ranked by filename and content matches. Use to orient yourself in an unfamiliar codebase.",
    inputSchema: codeSearchSchema,
  }),
  write_file: tool({
    description:
      "Create a new file or overwrite an existing one with full contents. Use for new files or when rewriting most of a file.",
    inputSchema: writeFileSchema,
  }),
  edit_file: tool({
    description:
      "Make a targeted edit to an existing file by replacing an exact, uniquely-matching snippet (search/replace). Prefer this for small to medium edits.",
    inputSchema: editFileSchema,
  }),
  rename_file: tool({
    description: "Rename or move a file within the project.",
    inputSchema: renameFileSchema,
  }),
  delete_file: tool({
    description: "Delete a file from the project.",
    inputSchema: deleteFileSchema,
  }),
  add_dependency: tool({
    description:
      "Add one or more npm packages to package.json and queue an install in the sandbox. Use instead of editing package.json by hand.",
    inputSchema: addDependencySchema,
  }),
  run_command: tool({
    description:
      "Run a shell command in the project sandbox (e.g. npm install, npm run build). Output is captured. Destructive commands are blocked.",
    inputSchema: runCommandSchema,
  }),
  write_plan: tool({
    description:
      "Present (or update) an implementation plan for the user to review. Plan mode only.",
    inputSchema: writePlanSchema,
  }),
  exit_plan: tool({
    description:
      "Transition from Plan mode to Build mode after the user accepts the plan. Call as your only action once accepted.",
    inputSchema: exitPlanSchema,
  }),
  write_app_blueprint: tool({
    description:
      "For a NEW app only: present a lightweight blueprint (name, design direction, primary color, asset prompts) for the user to review before implementation. Ends your turn; the user approves before you build.",
    inputSchema: writeAppBlueprintSchema,
  }),
} as const;

export type AgentToolName = keyof typeof allTools;

const READ_ONLY_TOOLS: AgentToolName[] = [
  "set_chat_summary",
  "list_files",
  "read_file",
  "grep",
  "code_search",
];

const BUILD_TOOLS: AgentToolName[] = [
  ...READ_ONLY_TOOLS,
  "update_todos",
  "write_file",
  "edit_file",
  "rename_file",
  "delete_file",
  "add_dependency",
  "run_command",
  "write_app_blueprint",
];

const PLAN_TOOLS: AgentToolName[] = [...READ_ONLY_TOOLS, "write_plan", "exit_plan"];

export type AgentMode = "build" | "ask" | "plan";

function pick(names: AgentToolName[]) {
  return Object.fromEntries(names.map((n) => [n, allTools[n]])) as Partial<
    typeof allTools
  >;
}

// Returns the tool subset allowed for a given mode (server-enforced).
export function getToolsForMode(mode: AgentMode) {
  switch (mode) {
    case "ask":
      return pick(READ_ONLY_TOOLS);
    case "plan":
      return pick(PLAN_TOOLS);
    case "build":
    default:
      return pick(BUILD_TOOLS);
  }
}

// Full catalog, used by the client tool executor.
export const agentTools = allTools;
