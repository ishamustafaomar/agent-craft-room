import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";

import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
  LOVABLE_AIG_RUN_ID_HEADER,
} from "@/lib/ai-gateway.server";
import { getToolsForMode, type AgentMode } from "@/lib/agent/tools";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { compactHistory } from "@/lib/agent/compaction";
import { DEFAULT_MODEL, isValidModel } from "@/lib/agent/models";

interface ChatRequestBody {
  messages?: unknown;
  model?: unknown;
  mode?: unknown;
  projectName?: unknown;
  template?: unknown;
  fileTree?: unknown;
  aiRules?: unknown;
}

const VALID_MODES: AgentMode[] = ["build", "ask", "plan"];

function parseMode(value: unknown): AgentMode {
  return typeof value === "string" && (VALID_MODES as string[]).includes(value)
    ? (value as AgentMode)
    : "build";
}

import { compactHistory } from "@/lib/agent/compaction";


function describeStreamError(error: unknown): string {
  const text =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/\b429\b|rate.?limit/i.test(text)) {
    return "Rate limit reached. Please wait a moment and try again.";
  }
  if (/\b402\b|credit|quota|insufficient/i.test(text)) {
    return "AI credits are exhausted. Add credits in Settings → Workspace → Usage to continue.";
  }
  return "The AI agent ran into an error. Please try again.";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const { messages } = body;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        // Require an authenticated user — this endpoint spends AI credits.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return new Response("Server not configured", { status: 500 });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) {
          return new Response("Unauthorized", { status: 401 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const model =
          typeof body.model === "string" && isValidModel(body.model)
            ? body.model
            : DEFAULT_MODEL;

        const mode = parseMode(body.mode);

        const system = buildSystemPrompt({
          mode,
          projectName: typeof body.projectName === "string" ? body.projectName : undefined,
          template: typeof body.template === "string" ? body.template : undefined,
          fileTree: typeof body.fileTree === "string" ? body.fileTree : undefined,
          aiRules: typeof body.aiRules === "string" ? body.aiRules : undefined,
        });

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);

        const history = await compactHistory(messages as UIMessage[], gateway);

        const result = streamText({
          model: gateway(model),
          system,
          messages: await convertToModelMessages(history),
          tools: getToolsForMode(mode),
          stopWhen: stepCountIs(50),
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { [LOVABLE_AIG_RUN_ID_HEADER]: initialRunId } : {}),
          }),
          onError: (error) => {
            console.error("[chat] stream error", error);
            return describeStreamError(error);
          },
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
