import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// WebContainers require the document to be cross-origin isolated. We set COOP +
// COEP on every response. `credentialless` lets cross-origin resources (images,
// fonts, the auth provider, etc.) load without requiring CORP headers on them,
// minimizing breakage while still enabling SharedArrayBuffer / isolation.
const crossOriginIsolationMiddleware = createMiddleware().server(async ({ next }) => {
  const response = await next();
  if (response instanceof Response) {
    try {
      response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
      response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
    } catch {
      // Some responses have immutable headers; ignore in that case.
    }
  }
  return response;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, crossOriginIsolationMiddleware],
}));
