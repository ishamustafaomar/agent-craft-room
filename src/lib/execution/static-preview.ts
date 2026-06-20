// Builds a self-contained HTML document that renders a generated React/Vite
// project entirely client-side, with no server, no WebContainer, and no
// cross-origin isolation. It is the primary renderer for the in-app preview
// pane and the public share/publish link.
//
// How it works: the returned HTML embeds the project's source files as JSON and
// a small loader that transpiles each module with Babel standalone (loaded from
// a CDN), rewrites relative + alias imports to blob URLs and bare imports to
// esm.sh, and dynamically imports the entry module. React/ReactDOM are pinned to
// a single version so hooks work across packages. Tailwind utility classes are
// supported via the Tailwind Play CDN, which is the agent's default styling
// stack.
//
// Limitations: this is a lightweight renderer, not a full build. Tooling that
// requires a real build step (custom PostCSS plugins, env injection, non-ESM
// CommonJS-only deps) won't be fully applied. For full fidelity, the user opens
// the workspace in a cross-origin-isolated top-level tab (WebContainer).

import type { FileMap } from "./types";

const ENTRY_CANDIDATES = [
  "src/main.tsx",
  "src/main.jsx",
  "src/main.ts",
  "src/main.js",
  "src/index.tsx",
  "src/index.jsx",
  "main.tsx",
  "main.jsx",
  "index.tsx",
  "index.jsx",
];

function findEntry(files: FileMap): string | null {
  const htmlKey =
    Object.keys(files).find((k) => k === "index.html") ??
    Object.keys(files).find((k) => k.endsWith("/index.html")) ??
    Object.keys(files).find((k) => k.toLowerCase().endsWith(".html"));

  if (htmlKey) {
    const m = files[htmlKey].match(/<script[^>]+src=["']([^"']+)["']/i);
    if (m) {
      const ref = m[1].replace(/^\.?\//, "");
      if (files[ref] != null) return "/" + ref;
    }
  }

  const cand = ENTRY_CANDIDATES.find((p) => files[p] != null);
  return cand ? "/" + cand : null;
}

// Heuristic: does this project use Tailwind? Either via the @tailwind/@import
// directives in CSS or a tailwind config file. When true we load the Play CDN so
// utility classes generated at runtime get styled.
function usesTailwind(files: FileMap): boolean {
  for (const [k, v] of Object.entries(files)) {
    if (/tailwind\.config\.(js|ts|cjs|mjs)$/.test(k)) return true;
    if (k.endsWith(".css") && /@tailwind\b|@import\s+["']tailwindcss/.test(v)) return true;
  }
  return false;
}

/**
 * Returns a full HTML document string suitable for an iframe `srcDoc`, or null
 * if the project has no recognizable client entry point to render statically.
 */
export function buildStaticPreviewDoc(files: FileMap): string | null {
  const entry = findEntry(files);
  if (!entry) return null;

  // Normalize all keys to a single leading slash so module resolution is
  // consistent regardless of how the source referenced them.
  const slashFiles: Record<string, string> = {};
  for (const [k, v] of Object.entries(files)) {
    slashFiles["/" + k.replace(/^\/+/, "")] = v;
  }
  if (slashFiles[entry] == null) return null;

  // Inline all CSS, but strip Tailwind directives (the Play CDN handles those).
  const css = Object.keys(slashFiles)
    .filter((k) => k.endsWith(".css"))
    .map((k) =>
      slashFiles[k]
        .replace(/@tailwind\s+[^;]+;/g, "")
        .replace(/@import\s+["']tailwindcss[^"']*["'];?/g, ""),
    )
    .join("\n");

  const tailwind = usesTailwind(files);

  const filesJson = JSON.stringify(slashFiles)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/<!--/g, "<\\!--");

  const tailwindTag = tailwind
    ? `<script src="https://cdn.tailwindcss.com"></script>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${tailwindTag}
<style>
html,body{margin:0;background:#fff;}
#__static_err{position:fixed;top:0;left:0;right:0;z-index:2147483647;max-height:60vh;overflow:auto;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;padding:16px;color:#b91c1c;background:#fff;border-bottom:1px solid #fca5a5;box-shadow:0 2px 8px rgba(0,0,0,.08);}
${css}
</style>
<script type="importmap">
{"imports":{
"react":"https://esm.sh/react@18.3.1",
"react/":"https://esm.sh/react@18.3.1/",
"react-dom":"https://esm.sh/react-dom@18.3.1",
"react-dom/":"https://esm.sh/react-dom@18.3.1/"
}}
</script>
<script src="https://unpkg.com/@babel/standalone@7.24.7/babel.min.js"></script>
</head>
<body>
<div id="root"></div>
<div id="__static_err" hidden></div>
<script>
window.__FILES__ = ${filesJson};
window.__ENTRY__ = ${JSON.stringify(entry)};
</script>
<script>
(function(){
  var FILES = window.__FILES__, ENTRY = window.__ENTRY__;
  var REACT = "https://esm.sh/react@18.3.1";
  var RDOM = "https://esm.sh/react-dom@18.3.1";
  var cache = {};
  var building = {};

  function showError(msg){
    var el = document.getElementById("__static_err");
    el.hidden = false;
    el.textContent = String(msg);
  }
  function dirname(p){ return p.slice(0, p.lastIndexOf("/")); }
  function normalize(p){
    var parts = p.split("/"), out = [];
    for (var i=0;i<parts.length;i++){
      var s = parts[i];
      if (s === "" || s === ".") continue;
      if (s === "..") out.pop(); else out.push(s);
    }
    return "/" + out.join("/");
  }
  function withExt(p){
    var cands = [p, p+".tsx", p+".ts", p+".jsx", p+".js", p+".mjs",
                 p+"/index.tsx", p+"/index.ts", p+"/index.jsx", p+"/index.js"];
    for (var i=0;i<cands.length;i++) if (FILES[cands[i]] != null) return cands[i];
    return null;
  }
  function resolveLocal(base, spec){
    return withExt(normalize(dirname(base) + "/" + spec));
  }
  // Vite-style path aliases: "@/x" and "~/x" -> "/src/x" (fall back to "/x").
  function resolveAlias(spec){
    var rest = spec.replace(/^[@~]\\//, "");
    return withExt("/src/" + rest) || withExt("/" + rest);
  }
  function mapBare(spec){
    if (spec === "react") return REACT;
    if (spec === "react/jsx-runtime") return REACT + "/jsx-runtime";
    if (spec === "react/jsx-dev-runtime") return REACT + "/jsx-dev-runtime";
    if (spec === "react-dom") return RDOM;
    if (spec.indexOf("react-dom/") === 0) return RDOM + spec.slice("react-dom".length);
    return "https://esm.sh/" + spec + "?external=react,react-dom";
  }
  var EMPTY = "data:text/javascript,export default {};";
  var importRe = /(import\\s+(?:[^'"]*?\\sfrom\\s+)?|export\\s+[^'"]*?\\sfrom\\s+|import\\s*\\()\\s*(['"])([^'"]+)\\2/g;

  function build(path){
    if (cache[path]) return cache[path];
    if (building[path]) return EMPTY; // cyclic import guard
    building[path] = true;
    var src = FILES[path] || "";
    var code;
    try {
      code = Babel.transform(src, {
        filename: path,
        presets: [
          ["react", { runtime: "automatic" }],
          ["typescript", { allExtensions: true, isTSX: true, onlyRemoveTypeImports: true }],
        ],
      }).code;
    } catch (e) {
      throw new Error("Failed to compile " + path + ":\\n" + (e && e.message ? e.message : e));
    }
    code = code.replace(importRe, function(m, pre, q, spec){
      if (/\\.(css|scss|sass|less|svg|png|jpg|jpeg|gif|webp|avif|json)$/i.test(spec)) return pre + q + EMPTY + q;
      if (spec[0] === ".") {
        var rp = resolveLocal(path, spec);
        return rp ? pre + q + build(rp) + q : pre + q + EMPTY + q;
      }
      if (spec[0] === "@" && spec[1] === "/" || spec[0] === "~" && spec[1] === "/") {
        var ap = resolveAlias(spec);
        return ap ? pre + q + build(ap) + q : pre + q + EMPTY + q;
      }
      if (spec[0] === "/") {
        var lp = withExt(spec);
        return lp ? pre + q + build(lp) + q : pre + q + mapBare(spec.slice(1)) + q;
      }
      return pre + q + mapBare(spec) + q;
    });
    var url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    cache[path] = url;
    return url;
  }

  function run(){
    try {
      var entryUrl = build(ENTRY);
      import(entryUrl).catch(function(e){ showError(e && e.stack ? e.stack : e); });
    } catch (e) {
      showError(e && e.stack ? e.stack : e);
    }
  }

  if (window.Babel) run();
  else {
    var t = setInterval(function(){
      if (window.Babel){ clearInterval(t); run(); }
    }, 30);
    setTimeout(function(){ clearInterval(t); if (!window.Babel) showError("Could not load the preview compiler."); }, 8000);
  }
})();
</script>
</body>
</html>`;
}
