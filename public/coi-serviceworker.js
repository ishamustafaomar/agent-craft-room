/*
 * coi-serviceworker — enables cross-origin isolation (window.crossOriginIsolated)
 * by re-injecting COOP/COEP headers on every response from a service worker.
 *
 * This lets the in-browser WebContainer live preview run even on environments
 * (like the Lovable sandbox preview) where the server's COOP/COEP headers are
 * stripped by an upstream proxy. Uses COEP `credentialless` so cross-origin
 * resources (images, fonts, auth provider) keep loading without CORP headers.
 *
 * Based on https://github.com/gzuidhof/coi-serviceworker (MIT).
 * Registration is handled by the app (see registerCoiServiceWorker).
 */
/* eslint-disable no-restricted-globals */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("message", (ev) => {
  if (ev.data && ev.data.type === "deregister") {
    self.registration
      .unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => clients.forEach((client) => client.navigate(client.url)));
  }
});

self.addEventListener("fetch", function (event) {
  const r = event.request;
  if (r.cache === "only-if-cached" && r.mode !== "same-origin") return;

  const request = r.mode === "no-cors" ? new Request(r, { credentials: "omit" }) : r;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 0) return response;

        const newHeaders = new Headers(response.headers);
        newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");
        newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      })
      .catch((e) => console.error(e)),
  );
});
