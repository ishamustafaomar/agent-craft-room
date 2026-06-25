// Borrow — hyperlocal neighborhood lending.
//
// Everything here is client-side and deterministic so the demo never errors
// or shows a broken empty state. The smart-search "brain" lives in this file:
// a synonym map + a tiny natural-language parser that pulls the ITEM and the
// WHEN out of a conversational sentence, then ranks nearby neighbors by
// distance. If an AI model were wired up it could replace `interpretQuery`,
// but the keyword/synonym matcher below is always available as a reliable
// fallback so results are sensible no matter what.

export interface Item {
  id: string;
  name: string; // friendly display name, e.g. "Pressure washer"
  emoji: string;
  category: string;
  /** Normalized search tags. Queries are matched against these. */
  tags: string[];
  owner: string; // first name
  /** Distance in miles, used for ranking (closest first). */
  distanceMi: number;
  /** Human label for the same distance, e.g. "2 doors down". */
  distanceLabel: string;
  /** Availability window, e.g. "Free this weekend". */
  availability: string;
  /** Rough retail value, used for the "money saved" impact counter. */
  value: number;
}

// ---------------------------------------------------------------------------
// Seed inventory — ~14 realistic listings across the block.
// ---------------------------------------------------------------------------

export const SEED_ITEMS: Item[] = [
  {
    id: "pressure-washer",
    name: "Pressure washer",
    emoji: "🚿",
    category: "Outdoor",
    tags: ["pressure washer", "power washer", "washer", "cleaning"],
    owner: "Maria",
    distanceMi: 0.05,
    distanceLabel: "2 doors down",
    availability: "Free this weekend",
    value: 220,
  },
  {
    id: "cordless-drill",
    name: "Cordless drill",
    emoji: "🪛",
    category: "Tools",
    tags: ["cordless drill", "drill", "power drill", "driver"],
    owner: "James",
    distanceMi: 0.1,
    distanceLabel: "4 doors down",
    availability: "Free weekday evenings",
    value: 95,
  },
  {
    id: "stand-mixer",
    name: "Stand mixer",
    emoji: "🎂",
    category: "Kitchen",
    tags: ["stand mixer", "mixer", "baking"],
    owner: "Tom",
    distanceMi: 0.2,
    distanceLabel: "just up the street",
    availability: "Free most afternoons",
    value: 180,
  },
  {
    id: "kitchenaid",
    name: "KitchenAid mixer",
    emoji: "🧁",
    category: "Kitchen",
    tags: ["kitchenaid", "kitchen aid", "stand mixer", "mixer", "baking"],
    owner: "Ava",
    distanceMi: 0.08,
    distanceLabel: "3 doors down",
    availability: "Free this weekend",
    value: 360,
  },
  {
    id: "extension-ladder",
    name: "Extension ladder",
    emoji: "🪜",
    category: "Tools",
    tags: ["extension ladder", "ladder", "step ladder"],
    owner: "Priya",
    distanceMi: 0.3,
    distanceLabel: "around the corner",
    availability: "Available anytime this week",
    value: 140,
  },
  {
    id: "camping-tent",
    name: "Camping tent",
    emoji: "⛺",
    category: "Outdoor",
    tags: ["camping tent", "tent", "camping", "4 person tent"],
    owner: "Sofia",
    distanceMi: 0.4,
    distanceLabel: "by the park",
    availability: "Free next weekend",
    value: 160,
  },
  {
    id: "hedge-trimmer",
    name: "Hedge trimmer",
    emoji: "🌳",
    category: "Garden",
    tags: ["hedge trimmer", "trimmer", "hedge cutter", "bush trimmer"],
    owner: "Dev",
    distanceMi: 0.15,
    distanceLabel: "5 doors down",
    availability: "Free Saturday mornings",
    value: 110,
  },
  {
    id: "carpet-cleaner",
    name: "Carpet cleaner",
    emoji: "🧽",
    category: "Home",
    tags: ["carpet cleaner", "carpet shampooer", "rug cleaner", "cleaning"],
    owner: "Nina",
    distanceMi: 0.25,
    distanceLabel: "across the street",
    availability: "Free this weekend",
    value: 130,
  },
  {
    id: "projector",
    name: "Projector",
    emoji: "📽️",
    category: "Electronics",
    tags: ["projector", "movie projector", "home cinema", "beamer"],
    owner: "Leo",
    distanceMi: 0.35,
    distanceLabel: "two streets over",
    availability: "Free weekend evenings",
    value: 240,
  },
  {
    id: "folding-tables",
    name: "Folding tables",
    emoji: "🪑",
    category: "Party",
    tags: ["folding tables", "folding table", "trestle table", "party tables"],
    owner: "Grace",
    distanceMi: 0.18,
    distanceLabel: "6 doors down",
    availability: "Free anytime",
    value: 90,
  },
  {
    id: "kids-bike",
    name: "Kids' bike",
    emoji: "🚲",
    category: "Kids",
    tags: ["kids bike", "kids' bike", "childs bike", "bicycle", "bike"],
    owner: "Omar",
    distanceMi: 0.12,
    distanceLabel: "4 doors down",
    availability: "Available this month",
    value: 120,
  },
  {
    id: "sewing-machine",
    name: "Sewing machine",
    emoji: "🧵",
    category: "Craft",
    tags: ["sewing machine", "sewing", "overlocker", "stitching"],
    owner: "Hana",
    distanceMi: 0.22,
    distanceLabel: "across the street",
    availability: "Free weekday afternoons",
    value: 150,
  },
  {
    id: "jigsaw",
    name: "Jigsaw",
    emoji: "🪚",
    category: "Tools",
    tags: ["jigsaw", "jig saw", "power saw", "saw"],
    owner: "Marcus",
    distanceMi: 0.28,
    distanceLabel: "around the corner",
    availability: "Free this weekend",
    value: 85,
  },
  {
    id: "wheelbarrow",
    name: "Wheelbarrow",
    emoji: "🛞",
    category: "Garden",
    tags: ["wheelbarrow", "wheel barrow", "garden cart", "barrow"],
    owner: "Ben",
    distanceMi: 0.33,
    distanceLabel: "two streets over",
    availability: "Available anytime this week",
    value: 95,
  },
];

// ---------------------------------------------------------------------------
// Synonym map: alias phrase -> canonical tag.
//
// The matcher checks whether each alias appears in the query, then collects
// the canonical tags. Items carrying any matched tag become results. Listing
// each canonical tag as its own alias keeps direct matches working too.
// ---------------------------------------------------------------------------

export const SYNONYMS: Record<string, string> = {
  // pressure washer
  "pressure washer": "pressure washer",
  "power washer": "pressure washer",
  "powerwasher": "pressure washer",
  "jet wash": "pressure washer",
  "pressure cleaner": "pressure washer",
  // drill
  "cordless drill": "drill",
  "power drill": "drill",
  "drill": "drill",
  "driver": "drill",
  "screwdriver": "drill",
  // mixer
  "stand mixer": "mixer",
  "kitchenaid": "kitchenaid",
  "kitchen aid": "kitchenaid",
  "mixer": "mixer",
  "dough mixer": "mixer",
  // ladder
  "extension ladder": "ladder",
  "step ladder": "ladder",
  "ladder": "ladder",
  // tent
  "camping tent": "camping",
  "tent": "camping",
  "camping gear": "camping",
  "camping": "camping",
  // hedge trimmer
  "hedge trimmer": "hedge trimmer",
  "hedge cutter": "hedge trimmer",
  "bush trimmer": "hedge trimmer",
  "trimmer": "hedge trimmer",
  // carpet cleaner
  "carpet cleaner": "carpet cleaner",
  "carpet shampooer": "carpet cleaner",
  "rug cleaner": "carpet cleaner",
  // projector
  "projector": "projector",
  "movie projector": "projector",
  "beamer": "projector",
  "home cinema": "projector",
  // folding tables
  "folding tables": "folding tables",
  "folding table": "folding tables",
  "trestle table": "folding tables",
  "party tables": "folding tables",
  // kids bike
  "kids bike": "bike",
  "kids' bike": "bike",
  "childs bike": "bike",
  "bicycle": "bike",
  "bike": "bike",
  // sewing machine
  "sewing machine": "sewing",
  "sewing": "sewing",
  "overlocker": "sewing",
  // jigsaw
  "jigsaw": "saw",
  "jig saw": "saw",
  "power saw": "saw",
  "saw": "saw",
  // wheelbarrow
  "wheelbarrow": "wheelbarrow",
  "wheel barrow": "wheelbarrow",
  "garden cart": "wheelbarrow",
  "barrow": "wheelbarrow",
};

// ---------------------------------------------------------------------------
// "When" parsing — pull a friendly time window out of the sentence.
// ---------------------------------------------------------------------------

const WHEN_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bthis weekend\b|\bweekend\b/i, label: "this weekend" },
  { re: /\bnext weekend\b/i, label: "next weekend" },
  { re: /\btonight\b|\bthis evening\b/i, label: "tonight" },
  { re: /\btomorrow\b/i, label: "tomorrow" },
  { re: /\bnext week\b/i, label: "next week" },
  { re: /\bthis week\b/i, label: "this week" },
  { re: /\btoday\b/i, label: "today" },
  { re: /\bmonday\b/i, label: "Monday" },
  { re: /\btuesday\b/i, label: "Tuesday" },
  { re: /\bwednesday\b/i, label: "Wednesday" },
  { re: /\bthursday\b/i, label: "Thursday" },
  { re: /\bfriday\b/i, label: "Friday" },
  { re: /\bsaturday\b/i, label: "Saturday" },
  { re: /\bsunday\b/i, label: "Sunday" },
];

function parseWhen(query: string): string | null {
  for (const { re, label } of WHEN_PATTERNS) {
    if (re.test(query)) return label;
  }
  return null;
}

function normalize(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").replace(/\s+/g, " ").trim()} `;
}

function phraseInQuery(query: string, phrase: string): boolean {
  return query.includes(` ${phrase} `);
}

export interface SearchResult {
  /** The raw query the neighbor typed. */
  query: string;
  /** Time window detected in the sentence, if any. */
  when: string | null;
  /** Whether we found a direct item match (vs. nearest alternatives). */
  isExact: boolean;
  /** Ranked items, closest first. */
  results: Item[];
  /** Friendly summary line shown above the results. */
  summary: string;
}

/**
 * Interpret a conversational query and return ranked neighbor matches.
 *
 * This is the deterministic synonym/keyword matcher. It always returns
 * something sensible — an exact match when possible, otherwise the closest
 * alternatives nearby — so the UI never hits a broken empty state.
 */
export function interpretQuery(rawQuery: string, items: Item[]): SearchResult {
  const query = normalize(rawQuery);
  const when = parseWhen(query);

  // 1. Collect canonical tags referenced anywhere in the sentence.
  //    Check longer alias phrases first so "stand mixer" wins over "mixer".
  const aliases = Object.keys(SYNONYMS).sort((a, b) => b.length - a.length);
  const matchedTags = new Set<string>();
  for (const alias of aliases) {
    if (phraseInQuery(query, alias)) matchedTags.add(SYNONYMS[alias]);
  }

  // 2. Items carrying any matched tag, ranked by distance (closest first).
  let results: Item[] = [];
  if (matchedTags.size > 0) {
    results = items
      .filter((it) => it.tags.some((t) => matchedTags.has(t)))
      .sort((a, b) => a.distanceMi - b.distanceMi);
  }

  if (results.length > 0) {
    const top = results[0];
    const whenBit = when ? `, free ${when}` : `, ${top.availability.toLowerCase()}`;
    const summary = `Found it — ${top.owner} has a ${top.name.toLowerCase()} ${top.distanceLabel}${whenBit}.`;
    return { query: rawQuery, when, isExact: true, results, summary };
  }

  // 3. No direct match — fall back to a fuzzy word-overlap score so we can
  //    still suggest the closest sensible alternatives instead of nothing.
  const queryWords = query.trim().split(" ").filter((w) => w.length > 2);
  const scored = items
    .map((it) => {
      const hay = normalize(`${it.name} ${it.category} ${it.tags.join(" ")}`);
      let score = 0;
      for (const w of queryWords) {
        if (phraseInQuery(hay, w)) score += 1;
      }
      return { it, score };
    })
    .sort((a, b) => b.score - a.score || a.it.distanceMi - b.it.distanceMi);

  const fuzzy = scored.filter((s) => s.score > 0).map((s) => s.it);
  if (fuzzy.length > 0) {
    return {
      query: rawQuery,
      when,
      isExact: false,
      results: fuzzy,
      summary: `No exact match, but ${fuzzy[0].owner}'s ${fuzzy[0].name.toLowerCase()} ${fuzzy[0].distanceLabel} looks close — here's what's nearby.`,
    };
  }

  // 4. Absolute fallback: the three closest things on the block.
  const nearest = [...items].sort((a, b) => a.distanceMi - b.distanceMi).slice(0, 3);
  return {
    query: rawQuery,
    when,
    isExact: false,
    results: nearest,
    summary: "Hmm, no exact match for that — but your neighbors have these close by.",
  };
}

// A friendly color per owner avatar, derived from the name so it's stable.
const AVATAR_COLORS = [
  "#2f6b4f",
  "#c2603f",
  "#3a7d63",
  "#a8552f",
  "#4a6b8a",
  "#7a5a8f",
  "#b08a2e",
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
