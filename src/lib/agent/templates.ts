// Starter templates used to seed a new project's virtual file system.
import { DEFAULT_AI_RULES } from "./system-prompt";

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

// Persistent per-project agent guidance, injected into every system prompt.
const AI_RULES_MD = DEFAULT_AI_RULES + "\n";


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

// ---- Specialized starters: distinct App + CSS so each template looks real. ----

function customViteFiles(app: string, css: string): TemplateFile[] {
  return [
    { path: "index.html", content: VITE_INDEX_HTML },
    { path: "package.json", content: VITE_PACKAGE_JSON },
    { path: "vite.config.ts", content: VITE_CONFIG },
    { path: "tsconfig.json", content: VITE_TSCONFIG },
    { path: "src/main.tsx", content: VITE_MAIN },
    { path: "src/index.css", content: css },
    { path: "src/App.tsx", content: app },
  ];
}

const LANDING_CSS = `:root { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; }
.nav { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 2rem; max-width: 1100px; margin: 0 auto; }
.brand { font-weight: 700; font-size: 1.1rem; }
.nav a { margin-left: 1.25rem; color: #475569; text-decoration: none; font-size: .95rem; }
.hero { text-align: center; padding: 5rem 1.5rem; max-width: 760px; margin: 0 auto; }
.hero h1 { font-size: 3rem; line-height: 1.05; margin: 0 0 1rem; letter-spacing: -.02em; }
.hero p { font-size: 1.2rem; color: #64748b; margin: 0 0 2rem; }
.cta { display: inline-block; background: #4f46e5; color: #fff; padding: .85rem 1.6rem; border-radius: 10px; text-decoration: none; font-weight: 600; }
.features { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); max-width: 1000px; margin: 0 auto 5rem; padding: 0 1.5rem; }
.card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.5rem; }
.card h3 { margin: 0 0 .5rem; }
.card p { margin: 0; color: #64748b; }
`;

const LANDING_APP = `const features = [
  { title: "Fast", body: "Built on Vite for instant hot reloads." },
  { title: "Modern", body: "React + TypeScript with a clean structure." },
  { title: "Yours", body: "Edit anything by chatting with the agent." },
];

export default function App() {
  return (
    <>
      <nav className="nav">
        <span className="brand">Acme</span>
        <div>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#">Sign in</a>
        </div>
      </nav>
      <header className="hero">
        <h1>Launch your idea faster</h1>
        <p>A beautiful landing page starter, ready to customize. Tell the agent what to change.</p>
        <a className="cta" href="#">Get started free</a>
      </header>
      <section id="features" className="features">
        {features.map((f) => (
          <div className="card" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>
    </>
  );
}
`;

const SAAS_CSS = `:root { font-family: system-ui, -apple-system, sans-serif; color: #e7e9ee; }
* { box-sizing: border-box; }
body { margin: 0; background: #0b0d12; }
.layout { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
.sidebar { background: #11141c; border-right: 1px solid #1f2430; padding: 1.25rem; }
.sidebar h2 { font-size: 1rem; margin: 0 0 1.5rem; }
.nav-item { display: block; padding: .55rem .75rem; border-radius: 8px; color: #9aa3b2; text-decoration: none; margin-bottom: .25rem; font-size: .9rem; }
.nav-item.active, .nav-item:hover { background: #1b2030; color: #fff; }
.main { padding: 2rem; }
.main h1 { margin: 0 0 1.5rem; font-size: 1.5rem; }
.stats { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.stat { background: #11141c; border: 1px solid #1f2430; border-radius: 12px; padding: 1.25rem; }
.stat .label { color: #9aa3b2; font-size: .85rem; }
.stat .value { font-size: 1.8rem; font-weight: 700; margin-top: .4rem; }
`;

const SAAS_APP = `const stats = [
  { label: "Revenue", value: "$24.5k" },
  { label: "Active users", value: "1,284" },
  { label: "Churn", value: "1.2%" },
  { label: "Signups", value: "312" },
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Acme SaaS</h2>
        <a className="nav-item active" href="#">Dashboard</a>
        <a className="nav-item" href="#">Customers</a>
        <a className="nav-item" href="#">Billing</a>
        <a className="nav-item" href="#">Settings</a>
      </aside>
      <main className="main">
        <h1>Dashboard</h1>
        <div className="stats">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <div className="label">{s.label}</div>
              <div className="value">{s.value}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
`;

const GAME_CSS = `:root { font-family: system-ui, sans-serif; color: #e7e9ee; }
* { box-sizing: border-box; }
body { margin: 0; background: #0b0d12; }
.game { min-height: 100vh; display: grid; place-items: center; gap: 1rem; }
canvas { background: #11141c; border: 1px solid #1f2430; border-radius: 12px; }
.score { font-size: 1.25rem; font-weight: 700; }
.hint { color: #9aa3b2; font-size: .9rem; }
`;

const GAME_APP = `import { useEffect, useRef, useState } from "react";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let x = 200, y = 150, dx = 2.5, dy = 2;
    let raf = 0;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      x += dx; y += dy;
      if (x < 12 || x > canvas.width - 12) { dx = -dx; setScore((s) => s + 1); }
      if (y < 12 || y > canvas.height - 12) dy = -dy;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#6366f1";
      ctx.fill();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="game">
      <div className="score">Bounces: {score}</div>
      <canvas ref={canvasRef} width={400} height={300} />
      <p className="hint">A simple bouncing-ball starter. Ask the agent to turn it into your game.</p>
    </div>
  );
}
`;

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
    description: "A polished marketing landing page with hero + features.",
    files: customViteFiles(LANDING_APP, LANDING_CSS),
  },
  saas: {
    id: "saas",
    name: "SaaS Dashboard",
    description: "A dark dashboard shell with sidebar and stat cards.",
    files: customViteFiles(SAAS_APP, SAAS_CSS),
  },
  game: {
    id: "game",
    name: "Browser Game",
    description: "A canvas game starter with an animation loop.",
    files: customViteFiles(GAME_APP, GAME_CSS),
  },
};

export function getTemplateFiles(templateId: string): TemplateFile[] {
  const tpl = TEMPLATES[templateId] ?? TEMPLATES.blank;
  return tpl.files;
}
