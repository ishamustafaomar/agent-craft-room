// Models offered in the workspace model picker. All route through the Lovable AI
// Gateway, which covers both Google (Gemini) and OpenAI (GPT) families — so
// "both providers" is available with no user-supplied keys.

export interface ModelOption {
  id: string;
  label: string;
  hint: string;
}

export interface ModelGroup {
  provider: string;
  models: ModelOption[];
}

export const MODEL_GROUPS: ModelGroup[] = [
  {
    provider: "Google",
    models: [
      {
        id: "google/gemini-3-flash-preview",
        label: "Gemini 3 Flash",
        hint: "Fast, balanced — great default for building.",
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
];

export const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const ALL_MODEL_IDS = new Set(
  MODEL_GROUPS.flatMap((g) => g.models.map((m) => m.id)),
);

export function isValidModel(id: string): boolean {
  return ALL_MODEL_IDS.has(id);
}

export function modelLabel(id: string): string {
  for (const g of MODEL_GROUPS) {
    const m = g.models.find((x) => x.id === id);
    if (m) return m.label;
  }
  return id;
}
