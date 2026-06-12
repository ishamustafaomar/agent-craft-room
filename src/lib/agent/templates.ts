// Starter templates used to seed a new project's virtual file system.
export interface TemplateFile {
  path: string;
  content: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  files: TemplateFile[];
}

const VITE_INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const VITE_PACKAGE_JSON = `{
  "name": "generated-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.1"
  }
}
`;

const VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: true },
});
`;

const VITE_TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
`;

const VITE_MAIN = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

const VITE_CSS = `:root {
  font-family: system-ui, -apple-system, sans-serif;
  color: #e7e9ee;
  background: #0b0d12;
}
* { box-sizing: border-box; }
body { margin: 0; }
.app {
  min-height: 100vh;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 2rem;
}
.card {
  background: #151821;
  border: 1px solid #232838;
  border-radius: 16px;
  padding: 2.5rem 3rem;
  box-shadow: 0 20px 60px -20px rgba(0,0,0,0.6);
}
h1 { margin: 0 0 .5rem; font-size: 2rem; }
p { margin: 0; color: #9aa3b2; }
`;

function viteApp(heading: string, sub: string) {
  return `export default function App() {
  return (
    <div className="app">
      <div className="card">
        <h1>${heading}</h1>
        <p>${sub}</p>
      </div>
    </div>
  );
}
`;
}

function baseViteFiles(heading: string, sub: string): TemplateFile[] {
  return [
    { path: "index.html", content: VITE_INDEX_HTML },
    { path: "package.json", content: VITE_PACKAGE_JSON },
    { path: "vite.config.ts", content: VITE_CONFIG },
    { path: "tsconfig.json", content: VITE_TSCONFIG },
    { path: "src/main.tsx", content: VITE_MAIN },
    { path: "src/index.css", content: VITE_CSS },
    { path: "src/App.tsx", content: viteApp(heading, sub) },
  ];
}

export const TEMPLATES: Record<string, Template> = {
  blank: {
    id: "blank",
    name: "Blank React App",
    description: "A minimal Vite + React + TypeScript starter.",
    files: baseViteFiles("Your new app", "Start chatting to build something."),
  },
  landing: {
    id: "landing",
    name: "Landing Page",
    description: "A marketing landing page starter.",
    files: baseViteFiles("Launch faster", "A beautiful landing page, ready to customize."),
  },
  saas: {
    id: "saas",
    name: "SaaS Dashboard",
    description: "A SaaS app shell with a dashboard layout.",
    files: baseViteFiles("Your SaaS", "Dashboard shell ready for features."),
  },
  game: {
    id: "game",
    name: "Browser Game",
    description: "A canvas-based game starter.",
    files: baseViteFiles("Game on", "A starting point for your browser game."),
  },
};

export function getTemplateFiles(templateId: string): TemplateFile[] {
  const tpl = TEMPLATES[templateId] ?? TEMPLATES.blank;
  return tpl.files;
}
