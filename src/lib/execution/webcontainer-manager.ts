import { WebContainer, type FileSystemTree } from "@webcontainer/api";
import type { FileMap } from "./types";

export type WCStatus =
  | "idle"
  | "booting"
  | "installing"
  | "starting"
  | "ready"
  | "error";

export interface WCCallbacks {
  onOutput?: (chunk: string) => void;
  onStatus?: (status: WCStatus, detail?: string) => void;
  onServerReady?: (url: string) => void;
}

// Convert a flat { path: content } map into the nested tree WebContainer wants.
function toFileSystemTree(files: FileMap): FileSystemTree {
  const tree: FileSystemTree = {};
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split("/").filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        node[part] = { file: { contents: content } };
      } else {
        if (!node[part] || !("directory" in node[part])) {
          node[part] = { directory: {} };
        }
        node = node[part].directory;
      }
    }
  }
  return tree;
}

const SERVE_COMMANDS = ["dev", "start", "serve", "preview"];

/**
 * Manages a single in-browser WebContainer instance for the workspace.
 * Booting is expensive and only one instance is allowed per page, so this is a
 * module-level singleton. The active project re-mounts its files on start.
 */
export class WebContainerManager {
  private container: WebContainer | null = null;
  private bootPromise: Promise<WebContainer> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private devProcess: any = null;
  private cb: WCCallbacks = {};
  private serverUrl: string | null = null;
  status: WCStatus = "idle";

  static isSupported(): boolean {
    return typeof window !== "undefined" && window.crossOriginIsolated === true;
  }

  setCallbacks(cb: WCCallbacks) {
    this.cb = cb;
  }

  private setStatus(status: WCStatus, detail?: string) {
    this.status = status;
    this.cb.onStatus?.(status, detail);
  }

  private log(chunk: string) {
    this.cb.onOutput?.(chunk);
  }

  private async boot(): Promise<WebContainer> {
    if (this.container) return this.container;
    if (!this.bootPromise) {
      this.setStatus("booting");
      this.bootPromise = WebContainer.boot({ coep: "credentialless" }).then((c) => {
        this.container = c;
        c.on("server-ready", (_port, url) => {
          this.serverUrl = url;
          this.setStatus("ready");
          this.cb.onServerReady?.(url);
        });
        c.on("error", (err) => {
          this.setStatus("error", err.message);
          this.log(`\n[error] ${err.message}\n`);
        });
        return c;
      });
    }
    return this.bootPromise;
  }

  /** Boot, mount the given files, install deps, and start the dev server. */
  async start(files: FileMap, cb: WCCallbacks) {
    this.setCallbacks(cb);
    try {
      const container = await this.boot();

      // Tear down any previous dev server before re-mounting.
      if (this.devProcess) {
        try {
          this.devProcess.kill();
        } catch {
          /* noop */
        }
        this.devProcess = null;
      }

      this.log("$ mounting project files\n");
      await container.mount(toFileSystemTree(files));

      this.setStatus("installing");
      this.log("$ npm install\n");
      const install = await container.spawn("npm", ["install"]);
      install.output.pipeTo(
        new WritableStream({ write: (data) => this.log(data) }),
      );
      const installCode = await install.exit;
      if (installCode !== 0) {
        this.setStatus("error", "npm install failed");
        this.log(`\n[error] npm install exited with code ${installCode}\n`);
        return;
      }

      this.setStatus("starting");
      this.log("\n$ npm run dev\n");
      const dev = await container.spawn("npm", ["run", "dev"]);
      this.devProcess = dev;
      dev.output.pipeTo(new WritableStream({ write: (data) => this.log(data) }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setStatus("error", message);
      this.log(`\n[error] ${message}\n`);
    }
  }

  isBooted(): boolean {
    return this.container !== null;
  }

  getServerUrl(): string | null {
    return this.serverUrl;
  }

  /** Mirror a single agent file write into the running container (live HMR). */
  async writeFile(path: string, content: string): Promise<void> {
    if (!this.container) return;
    const dir = path.split("/").slice(0, -1).join("/");
    if (dir) {
      try {
        await this.container.fs.mkdir(dir, { recursive: true });
      } catch {
        /* exists */
      }
    }
    await this.container.fs.writeFile(path, content);
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.container) return;
    try {
      await this.container.fs.rm(path);
    } catch {
      /* missing */
    }
  }

  /** Run a one-off command in the container, streaming output. */
  async runCommand(
    command: string,
    onOutput?: (chunk: string) => void,
  ): Promise<{ output: string; exitCode: number }> {
    if (!this.container) {
      const msg = `$ ${command}\n[skipped] Start the live sandbox first.`;
      onOutput?.(msg);
      return { output: msg, exitCode: 0 };
    }

    const [bin, ...args] = command.trim().split(/\s+/);

    // Long-running serve commands are owned by the preview lifecycle, not the agent.
    if (bin === "npm" && SERVE_COMMANDS.includes(args[1] ?? "")) {
      const msg = `$ ${command}\n[skipped] The dev server is managed by the preview panel.`;
      onOutput?.(msg);
      return { output: msg, exitCode: 0 };
    }

    let collected = `$ ${command}\n`;
    onOutput?.(`$ ${command}\n`);
    const proc = await this.container.spawn(bin, args);
    proc.output.pipeTo(
      new WritableStream({
        write: (data) => {
          collected += data;
          onOutput?.(data);
        },
      }),
    );
    const exitCode = await proc.exit;
    return { output: collected, exitCode };
  }

  teardown() {
    if (this.devProcess) {
      try {
        this.devProcess.kill();
      } catch {
        /* noop */
      }
      this.devProcess = null;
    }
    if (this.container) {
      try {
        this.container.teardown();
      } catch {
        /* noop */
      }
    }
    this.container = null;
    this.bootPromise = null;
    this.serverUrl = null;
    this.status = "idle";
  }
}

let singleton: WebContainerManager | null = null;

export function getWebContainerManager(): WebContainerManager {
  if (!singleton) singleton = new WebContainerManager();
  return singleton;
}
