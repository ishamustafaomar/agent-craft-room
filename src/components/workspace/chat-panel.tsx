import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { executeAgentTool } from "@/lib/execution/tool-executor";
import type { Runtime } from "@/lib/execution/types";
import { saveMessages, updateChatSummary } from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToolActivity } from "./tool-activity";
import { MarkdownMessage } from "./markdown-message";
import { Sparkles, ArrowUp, Loader2, Square } from "lucide-react";
import { toast } from "sonner";

interface ChatPanelProps {
  projectId: string;
  projectName: string;
  template: string;
  model: string;
  mode: "build" | "ask" | "plan";
  runtime: Runtime;
  initialMessages: UIMessage[];
  initialPrompt?: string;
  getFileTree: () => string;
  getAiRules: () => string;
  onExitPlan?: () => void;
  onCommandOutput?: (chunk: string) => void;
}

export function ChatPanel({
  projectId,
  projectName,
  template,
  model,
  mode,
  runtime,
  initialMessages,
  initialPrompt,
  getFileTree,
  getAiRules,
  onExitPlan,
  onCommandOutput,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, addToolOutput, stop } = useChat({
    id: projectId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      if (toolCall.dynamic) return;
      try {
        const output = await executeAgentTool(toolCall.toolName, toolCall.input, {
          runtime,
          onCommandOutput,
          onSummary: (summary) => {
            updateChatSummary({ data: { projectId, summary } }).catch(() => {});
          },
          onExitPlan,
        });
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output,
        });
      } catch (err) {
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: err instanceof Error ? err.message : "Tool execution failed",
        });
      }
    },
    onError: (err) => {
      console.error("[chat]", err);
      const msg = err instanceof Error ? err.message : "The agent ran into an error.";
      toast.error(msg);
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  // Auto-scroll on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // Keep textarea focused.
  useEffect(() => {
    if (!isBusy) textareaRef.current?.focus();
  }, [isBusy]);

  // Persist conversation when a turn settles.
  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return;
    const rows = messages.map((m) => ({
      messageId: m.id,
      role: m.role,
      parts: m.parts as unknown[],
    }));
    const timer = setTimeout(() => {
      saveMessages({ data: { projectId, messages: rows } }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [status, messages, projectId]);

  function submitPrompt(text: string) {
    sendMessage(
      { text },
      {
        body: {
          projectName,
          template,
          model,
          mode,
          fileTree: getFileTree(),
          aiRules: getAiRules(),
        },
      },
    );
  }

  function handleSend() {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    submitPrompt(text);
  }

  // Auto-run the prompt the user typed on the dashboard for a fresh project.
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;
    const text = initialPrompt?.trim();
    if (!text || messages.length > 0) return;
    autoSentRef.current = true;
    submitPrompt(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);


  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">AI Agent</span>
      </div>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="flex flex-col gap-4 p-4">
          {messages.length === 0 && (
            <div className="mt-10 text-center text-sm text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p>Describe what you want to build.</p>
              <p className="mt-1 text-xs">
                e.g. "Build a todo app with dark mode and local storage."
              </p>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        <div className="relative flex items-end gap-2 rounded-xl border border-input bg-background p-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask the agent to build or change something…"
            className="max-h-40 min-h-[44px] resize-none border-0 bg-transparent p-1.5 shadow-none focus-visible:ring-0"
          />
          {isBusy ? (
            <Button size="icon" variant="secondary" onClick={() => stop()} className="shrink-0">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return isUser ? (
              <span key={i} className="whitespace-pre-wrap">
                {part.text}
              </span>
            ) : (
              <MarkdownMessage key={i} content={part.text} />
            );
          }
          if (part.type.startsWith("tool-")) {
            return <ToolActivity key={i} part={part} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
