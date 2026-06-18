const COI_RELOAD_KEY = "breezy:coi-reload:v3";

export function isEmbeddedDocument(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function reloadOnce(forceReload = false): boolean {
  if (forceReload) window.sessionStorage.removeItem(COI_RELOAD_KEY);
  if (window.sessionStorage.getItem(COI_RELOAD_KEY)) return false;
  window.sessionStorage.setItem(COI_RELOAD_KEY, "true");
  window.location.reload();
  return true;
}

function waitForController(): Promise<void> {
  if (navigator.serviceWorker.controller) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, 1500);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Registers a service worker that re-injects COOP/COEP headers so the page can
 * become cross-origin isolated for the in-browser WebContainer preview.
 */
export async function registerCoiServiceWorker(options?: {
  forceReload?: boolean;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.crossOriginIsolated) {
    window.sessionStorage.removeItem(COI_RELOAD_KEY);
    return true;
  }

  if (!("serviceWorker" in navigator)) return false;

  // A child iframe cannot make itself cross-origin isolated if the parent frame
  // is not isolated too. Avoid a reload loop in embedded preview shells and let
  // the UI offer a top-level tab instead.
  if (isEmbeddedDocument()) return false;

  try {
    const registration = await navigator.serviceWorker.register("/coi-serviceworker.js", {
      scope: "/",
    });

    await navigator.serviceWorker.ready;
    await waitForController();

    if (!window.crossOriginIsolated) {
      reloadOnce(options?.forceReload);
      return false;
    }

    registration.addEventListener("updatefound", () => {
      reloadOnce(true);
    });
  } catch (err) {
    console.error("COOP/COEP service worker failed to register:", err);
  }

  return window.crossOriginIsolated;
}

export async function retryCoiIsolation(): Promise<void> {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(COI_RELOAD_KEY);
  try {
    const registration = await navigator.serviceWorker?.getRegistration("/");
    await registration?.update();
  } catch {
    /* retry still reloads below */
  }
  window.location.reload();
}
