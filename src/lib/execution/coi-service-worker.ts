/**
 * Registers a service worker that re-injects COOP/COEP headers so the page
 * becomes cross-origin isolated (window.crossOriginIsolated === true), which
 * the in-browser WebContainer live preview requires.
 *
 * On the published site the server already sets these headers, so this is a
 * no-op there. In environments where an upstream proxy strips the headers
 * (e.g. the Lovable sandbox preview), the service worker supplies them and the
 * page reloads once to take effect.
 *
 * Returns true when the page is already cross-origin isolated.
 */
export async function registerCoiServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.crossOriginIsolated) return true;

  if (!("serviceWorker" in navigator)) return false;

  // Avoid a reload loop: only reload once per session attempt.
  const RELOAD_KEY = "coiReloadedBySelf";

  try {
    const registration = await navigator.serviceWorker.register("/coi-serviceworker.js", {
      scope: "/",
    });

    // If a worker is active but not yet controlling this page, reload once so
    // its rewritten headers apply and isolation turns on.
    if (registration.active && !navigator.serviceWorker.controller) {
      if (!window.sessionStorage.getItem(RELOAD_KEY)) {
        window.sessionStorage.setItem(RELOAD_KEY, "true");
        window.location.reload();
      }
    }

    registration.addEventListener("updatefound", () => {
      if (!window.sessionStorage.getItem(RELOAD_KEY)) {
        window.sessionStorage.setItem(RELOAD_KEY, "true");
        window.location.reload();
      }
    });
  } catch (err) {
    console.error("COOP/COEP service worker failed to register:", err);
  }

  return window.crossOriginIsolated;
}
