// Models offered in the workspace model picker. All route through the Lovable AI
// Gateway, which covers Google (Gemini), OpenAI (GPT) and cloud (Anthropic
// Claude) families — so "all providers" are available with no user-supplied keys.

export interface ModelOption {
  id: string;
  label: string;
  hint: string;
}

export interface ModelGroup {
  provider: string;
  models: ModelOption[];
}

// The default real model used when "Auto" is selected (or anything invalid).
export const RESOLVED_DEFAULT_MODEL = "google/gemini-3-flash-preview";

// The sentinel id for automatic model selection — the UI default.
export const AUTO_MODEL = "auto";

export const MODEL_GROUPS: ModelGroup[] = [
  {
    provider: "Recommended",
    models: [
      {
        id: AUTO_MODEL,
        label: "Auto",
        hint: "Breezy picks the best model for each task.",
      },
    ],
  },
  {
    provider: "Google",
    models: [
      {
        id: "google/gemini-3-flash-preview",
        label: "Gemini 3 Flash",
        hint: "Fast, balanced — great for building.",
      },
      {
        id: "google/gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        hint: "Strongest Gemini for complex reasoning.",
      },
      {
        id: "google/gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        hint: "Lower cost/latency, solid quality.",
      },
      {
        id: "google/gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash Lite",
        hint: "Cheapest & fastest for simple edits.",
      },
    ],
  },
  {
    provider: "OpenAI",
    models: [
      {
        id: "openai/gpt-5",
        label: "GPT-5",
        hint: "Powerful all-rounder for accuracy.",
      },
      {
        id: "openai/gpt-5-mini",
        label: "GPT-5 Mini",
        hint: "Balanced cost and capability.",
      },
      {
        id: "openai/gpt-5-nano",
        label: "GPT-5 Nano",
        hint: "Fastest & cheapest for high volume.",
      },
    ],
  },
  {
    provider: "Anthropic (Cloud)",
    models: [
      {
        id: "anthropic/claude-opus-4.8",
        label: "Claude Opus 4.8",
        hint: "Most capable cloud model for hard tasks.",
      },
      {
        id: "anthropic/claude-sonnet-4.5",
        label: "Claude Sonnet 4.5",
        hint: "Balanced cloud model for everyday building.",
      },
      {
        id: "anthropic/claude-haiku-4.5",
        label: "Claude Haiku 4.5",
        hint: "Fast, cost-efficient cloud model.",
      },
    ],
  },
];

// The default selection shown in the picker.
export const DEFAULT_MODEL = AUTO_MODEL;

const ALL_MODEL_IDS = new Set(
  MODEL_GROUPS.flatMap((g) => g.models.map((m) => m.id)),
);

export function isValidModel(id: string): boolean {
  return ALL_MODEL_IDS.has(id);
}

// Resolve a picker selection to a concrete gateway model id. "Auto" (and any
// unknown value) falls back to the recommended default.
export function resolveModel(id: string | undefined): string {
  if (!id || id === AUTO_MODEL || !isValidModel(id)) return RESOLVED_DEFAULT_MODEL;
  return id;
}

export function modelLabel(id: string): string {
  for (const g of MODEL_GROUPS) {
    const m = g.models.find((x) => x.id === id);
    if (m) return m.label;
  }
  return id;
}
