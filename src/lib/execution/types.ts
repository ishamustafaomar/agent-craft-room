// Execution runtime abstraction. The agent's file/command tools run against a
// Runtime, decoupling the agent from the underlying engine. Stage 1 uses a
// database-backed runtime; Stage 2 swaps in a WebContainer runtime.

export interface CommandResult {
  output: string;
  exitCode: number;
}

export interface Runtime {
  readFile(path: string): string | undefined;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listFiles(): string[];
  runCommand(command: string, onOutput?: (chunk: string) => void): Promise<CommandResult>;
}

export type FileMap = Record<string, string>;
