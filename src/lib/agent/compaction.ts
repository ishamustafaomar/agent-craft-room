// Server-side context compaction. When a conversation grows long, older turns are
// summarized into a single structured synthetic message so detail is preserved
// instead of dropped. Adapted from Dyad's COMPACTION_SYSTEM_PROMPT.
import { generateText, type UIMessage } from "ai";
import { RESOLVED_DEFAULT_MODEL } from "./models";

export const COMPACTION_SYSTEM_PROMPT = `You are summarizing a coding conversation to preserve the most important context while staying concise.

Analyze the conversation and generate a structured summary that lets it continue effectively.

## Output Format

## Key Decisions Made
- [Decision: brief description with rationale]

## Code Changes Completed
- \`path/to/file.ts\` - [what changed and why]

## Current Task State
[1-2 sentences on what the user is currently working on or asking about]

## Important Context
[Critical context to continue: error messages being debugged, specific requirements, technical constraints, files needing further modification]

## Guidelines
1. Be concise — the minimum needed to continue effectively.
2. Prioritize recent changes.
3. Always use exact file paths when referencing code.
4. Capture the "why" behind decisions, not just the "what".
5. Preserve exact error messages being debugged.
6. Skip empty sections entirely.`;

// Keep the most recent turns verbatim; everything older gets summarized.
const RECENT_WINDOW = 16;
// Don't bother summarizing until the conversation is meaningfully long.
const COMPACTION_THRESHOLD = 30;

function messageToText(m: UIMessage): string {
  const parts = (m.parts ?? []) as Array<Record<string, unknown>>;
  const chunks: string[] = [];
  for (const part of parts) {
    const type = String(part.type ?? "");
    if (type === "text" && typeof part.text === "string") {
      chunks.push(part.text);
    } else if (type.startsWith("tool-")) {
      const name = type.replace(/^tool-/, "");
      const input = part.input ? JSON.stringify(part.input).slice(0, 400) : "";
      chunks.push(`[tool ${name} ${input}]`);
    }
  }
  return `${m.role.toUpperCase()}: ${chunks.join("\n").trim()}`;
}

type GatewayModel = (id: string) => Parameters<typeof generateText>[0]["model"];

export async function compactHistory(
  messages: UIMessage[],
  gateway: GatewayModel,
): Promise<UIMessage[]> {
  if (messages.length <= COMPACTION_THRESHOLD) return messages;

  const older = messages.slice(0, messages.length - RECENT_WINDOW);
  const recent = messages.slice(messages.length - RECENT_WINDOW);

  const transcript = older.map(messageToText).join("\n\n").slice(0, 24000);

  let summaryText: string;
  try {
    const { text } = await generateText({
      model: gateway(RESOLVED_DEFAULT_MODEL),
      system: COMPACTION_SYSTEM_PROMPT,
      prompt: `Summarize the earlier part of this coding conversation:\n\n${transcript}`,
    });
    summaryText = text.trim();
  } catch (e) {
    console.error("[chat] compaction failed, falling back to trim", e);
    return messages.slice(-RECENT_WINDOW);
  }

  const summaryMessage: UIMessage = {
    id: "compaction-summary",
    role: "user",
    parts: [
      {
        type: "text",
        text: `[Summary of earlier conversation — for your context]\n\n${summaryText}`,
      },
    ],
  };

  return [summaryMessage, ...recent];
}
