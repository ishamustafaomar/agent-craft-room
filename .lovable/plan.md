# Improve AI output & fix preview/chat bugs

The "bad output" you're seeing is mostly the **preview engine** failing to render what the agent generates, plus a few UI bugs — not just the model. Here's what's actually broken and how I'll fix each piece.

## What's wrong (root causes)

1. **"It can only do icons, not pictures."** The static preview renderer (`static-preview.ts`) throws away every local image import (`.png/.jpg/.svg/...`) and replaces it with an empty module. So any real image the agent adds renders as nothing — only code-drawn icons (lucide) survive. The agent is also never told to use real images.
2. **"The Flavors tab turns black."** When generated apps use client-side routing/navigation inside the sandboxed `srcdoc` iframe, a runtime error during the click (e.g. history API in an opaque origin, or an uncaught render error) unmounts React to a black screen. Errors thrown *after* initial load aren't caught, so nothing is shown.
3. **"Full tab doesn't open a new tab."** The button calls `window.open(...)`, which is blocked inside our sandboxed embedded preview. It needs to be a real link.
4. **"Chat text gets cut off when the window is smaller."** Message bubbles and code/inline snippets don't shrink/wrap, so long words and code overflow horizontally and clip.

## The fixes

### 1. Real images in the preview (`static-preview.ts` + agent prompt)
- Inline **SVG** imports as data URLs (SVG is text, so it can be embedded and will render).
- For raster images that can't be bundled, keep remote `<img src="https://...">` working (already does) and stop silently blanking them.
- Update the system prompt + `DEFAULT_AI_RULES` so the agent **uses real remote images** (e.g. Unsplash/picsum URLs) and inline SVG for graphics instead of importing local binary files it can't bundle. This is the single biggest quality win for "it can't do pictures."

### 2. Stop the black-screen on navigation (`static-preview.ts`)
- Inject a global runtime error handler in the preview document that catches `window.onerror` / `unhandledrejection` and shows the error in the existing error overlay instead of going black.
- Add a `<base>` tag and a tiny history shim so client-side routing doesn't crash the opaque-origin iframe.
- Add a guidance note in the prompt to prefer state-based tabs or `HashRouter` for in-preview navigation.

### 3. Make "Full tab" actually open a tab (`preview-panel.tsx`, `workspace-panel.tsx`, `project.$projectId.tsx`)
- Replace the `window.open(...)` buttons with real `<a target="_blank" rel="noreferrer">` links pointing at the standalone public preview route `/p/{projectId}`, which renders the app full-screen on its own. Anchors open even when `window.open` is blocked.

### 4. Responsive chat panel (`chat-panel.tsx`, `markdown-message.tsx`)
- Add `min-w-0` / `break-words` / `overflow-wrap-anywhere` to the message bubble and markdown wrapper so text reflows instead of clipping.
- Make inline code and code blocks wrap or scroll within the available width.
- Ensure the model/mode control row stays usable at narrow widths.

### 5. General output-quality boost (agent prompt)
- Tighten `system-prompt.ts` / `DEFAULT_AI_RULES` with concrete guidance: use real images, build polished responsive layouts, prefer in-preview-safe navigation, avoid local binary asset imports, and add an error boundary to generated apps so a single component error never blacks out the whole screen.

## Technical notes
- Changes are limited to the preview renderer (`src/lib/execution/static-preview.ts`), the preview/workspace UI (`preview-panel.tsx`, `workspace-panel.tsx`, `project.$projectId.tsx`), the chat UI (`chat-panel.tsx`, `markdown-message.tsx`), and the agent prompt (`src/lib/agent/system-prompt.ts`).
- No database or backend changes.
- `allow-same-origin` will **not** be added to the published preview sandbox (security risk for arbitrary generated code); routing is fixed via error surfacing + prompt guidance instead.

## Optional (ask if you want it)
- Add a real **image-generation tool** to the agent (via Lovable AI) so it can create actual custom images/illustrations on request, not just pull stock photos. This is a larger addition — I left it out of the core plan but can add it.

Want me to include the image-generation tool, or just do the five fixes above?
