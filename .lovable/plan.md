## Plan

1. **Separate the two preview modes clearly**
   - Keep the WebContainer live sandbox for full-tab/published contexts where browser isolation can work.
   - Add a safe embedded fallback inside the Lovable preview pane so the right-side preview area still shows the generated app instead of only the isolation warning.
   - The embedded fallback will render a lightweight static preview from the generated files when possible, while preserving editing/building behavior.

2. **Make “Open full tab” reliable**
   - Update the isolation retry/open flow so full-tab opens the current workspace route directly.
   - In a top-level tab, register/refresh the COI service worker, wait for control, then reload once if needed.
   - Avoid reload loops and show a short, non-cluttered status if the browser still cannot isolate.

3. **Fix share/public link expectations**
   - Adjust the shared/public preview UI copy and behavior so it does not imply the embedded preview can run WebContainers.
   - Ensure shared links guide users to the published site/full-tab flow when they need the runnable sandbox.
   - If the project is not published, the share flow should say that the live sandbox is available only after publishing/opening in a supported top-level tab.

4. **Clean up the isolation screen**
   - Replace the current long warning text with compact Breezy-style messaging.
   - Provide only the useful actions: **Open full tab**, **Retry**, and where applicable **Publish & share** guidance.
   - Make sure text wraps at any panel ratio and never gets clipped.

5. **Validate the result**
   - Test embedded preview: it should no longer look broken or stuck.
   - Test full-tab preview: `crossOriginIsolated` should become true and the WebContainer preview can start.
   - Test published/share route messaging so users get a link that works for the intended mode.

## Technical notes

- The browser does not allow a child iframe to make itself cross-origin isolated unless the parent frame is also isolated, so a true WebContainer live preview cannot run inside the embedded Lovable preview pane.
- The fix is to provide a graceful embedded fallback and make the top-level full-tab/published path reliable for the real live sandbox.