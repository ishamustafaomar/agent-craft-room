import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Sparkles,
  MapPin,
  Heart,
  Leaf,
  X,
  ArrowRight,
  PackageOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  SEED_ITEMS,
  interpretQuery,
  avatarColor,
  type Item,
  type SearchResult,
} from "@/lib/borrow/data";

export const Route = createFileRoute("/borrow")({
  head: () => ({
    meta: [
      { title: "Borrow — your block already owns it" },
      {
        name: "description",
        content:
          "Borrow, don't buy. A hyperlocal lending app where neighbors share the stuff they rarely use.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Nunito:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: BorrowApp,
});

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Tween a number up to `target` for the impact counters. */
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return value;
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm"
      style={{
        width: size,
        height: size,
        background: avatarColor(name),
        fontSize: size * 0.42,
      }}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

interface Borrow {
  id: string;
  item: Item;
  from: string;
  to: string;
  message: string;
  status: "Pending" | "Approved";
}

const CATEGORIES = [
  "Tools",
  "Kitchen",
  "Outdoor",
  "Garden",
  "Home",
  "Electronics",
  "Party",
  "Kids",
  "Craft",
];

const EMOJI_CHOICES = ["🔨", "🪛", "🚿", "🎂", "⛺", "🌳", "🧽", "📽️", "🪜", "🚲", "🧵", "🪚", "🛞", "🧁", "📦"];

const SUGGESTIONS = [
  "I need a pressure washer this Saturday",
  "Anyone have a cordless drill?",
  "Looking for a stand mixer for baking",
  "Extension ladder for the weekend",
];

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------

function BorrowApp() {
  const [items, setItems] = useState<Item[]>(SEED_ITEMS);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);

  const [impact, setImpact] = useState({ shared: 47, saved: 3240, bought: 31 });
  const [borrows, setBorrows] = useState<Borrow[]>([]);

  const [borrowTarget, setBorrowTarget] = useState<Item | null>(null);
  const [lendOpen, setLendOpen] = useState(false);
  const [myBorrowsOpen, setMyBorrowsOpen] = useState(false);

  const shared = useCountUp(impact.shared);
  const saved = useCountUp(impact.saved);
  const bought = useCountUp(impact.bought);

  const pendingCount = borrows.length;

  function runSearch(q: string) {
    const text = q.trim();
    if (!text) {
      setResult(null);
      return;
    }
    setResult(interpretQuery(text, items));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  function handleBorrowConfirm(borrow: Borrow) {
    setBorrows((b) => [borrow, ...b]);
    setImpact((i) => ({
      shared: i.shared + 1,
      saved: i.saved + Math.round(borrow.item.value * 0.9),
      bought: i.bought + 1,
    }));
    setBorrowTarget(null);
    toast.success(`Request sent to ${borrow.item.owner}!`, {
      description: `${borrow.item.owner} usually replies within an hour.`,
    });
    // Demo delight: the neighbor "approves" a moment later.
    window.setTimeout(() => {
      setBorrows((list) =>
        list.map((x) => (x.id === borrow.id ? { ...x, status: "Approved" } : x)),
      );
    }, 5000);
  }

  function handleLend(item: Item) {
    setItems((prev) => [item, ...prev]);
    setLendOpen(false);
    toast.success(`${item.name} is now on the block!`, {
      description: "Your neighbors can find it in search right away.",
    });
  }

  const browseItems = useMemo(
    () => [...items].sort((a, b) => a.distanceMi - b.distanceMi),
    [items],
  );

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, #dff0e2 0%, #eaf5ec 35%, #e3f1e6 100%)",
        fontFamily: "'Nunito', ui-sans-serif, system-ui, sans-serif",
        color: "#1d3a2c",
      }}
    >
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-2xl shadow-sm"
              style={{ background: "#fff", boxShadow: "0 6px 18px -8px rgba(31,77,54,0.4)" }}
            >
              🤝
            </div>
            <div className="leading-tight">
              <div
                className="text-2xl font-bold"
                style={{ fontFamily: "'Fraunces', serif", color: "#143625" }}
              >
                Borrow
              </div>
              <div className="text-xs font-semibold text-[#5b7a68]">Your block already owns it</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMyBorrowsOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 text-sm font-bold text-[#1d3a2c] shadow-sm ring-1 ring-[#cfe5d5] transition hover:bg-white"
            >
              <PackageOpen className="h-4 w-4" />
              My borrows
              {pendingCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff6b4a] px-1 text-[11px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setLendOpen(true)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-105"
              style={{ background: "#1f6b47", boxShadow: "0 8px 20px -8px rgba(31,107,71,0.6)" }}
            >
              <Plus className="h-4 w-4" />
              Lend something
            </button>
          </div>
        </header>

        {/* Impact banner */}
        <div
          className="mt-6 overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-6"
          style={{
            background: "linear-gradient(120deg, #1f6b47 0%, #2f8a5e 55%, #3f9d6c 100%)",
            boxShadow: "0 20px 40px -20px rgba(31,107,71,0.7)",
          }}
        >
          <div className="flex items-center gap-2 text-sm font-bold text-[#cfeede]">
            <Leaf className="h-4 w-4" /> Your block's impact
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
            <Stat label="items shared" value={shared.toLocaleString()} />
            <Stat label="saved together" value={`$${saved.toLocaleString()}`} />
            <Stat label="fewer things bought" value={bought.toLocaleString()} />
          </div>
          <p className="mt-3 text-sm font-semibold text-[#e3f5ea]">
            Every borrow is one less thing manufactured, shipped, and tucked in a garage.
          </p>
        </div>

        {/* Search hero */}
        <section className="mt-8 text-center">
          <h1
            className="mx-auto max-w-2xl text-3xl font-bold leading-tight sm:text-5xl"
            style={{ fontFamily: "'Fraunces', serif", color: "#143625" }}
          >
            Borrow it, don't buy it.
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-base font-semibold text-[#4f6e5d] sm:text-lg">
            Tell us what you need in plain words — we'll find the closest neighbor who has it.
          </p>

          <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-2xl">
            <div
              className="flex items-center gap-2 rounded-full bg-white p-2 pl-5 shadow-xl ring-1 ring-[#d4e8d9]"
              style={{ boxShadow: "0 24px 50px -24px rgba(20,54,37,0.45)" }}
            >
              <Search className="h-5 w-5 shrink-0 text-[#8aa896]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you need? Try 'I need a pressure washer this Saturday'"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-base font-semibold text-[#1d3a2c] outline-none placeholder:text-[#9bb3a4]"
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-105 sm:px-5"
                style={{ background: "#ff6b4a", boxShadow: "0 10px 22px -8px rgba(255,107,74,0.7)" }}
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Find it</span>
              </button>
            </div>
          </form>

          {!result && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    runSearch(s);
                  }}
                  className="rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-bold text-[#3f6450] ring-1 ring-[#d4e8d9] transition hover:bg-white"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Results / browse */}
        <section className="mt-8">
          {result ? (
            <ResultsView
              result={result}
              onClear={() => {
                setResult(null);
                setQuery("");
              }}
              onAsk={setBorrowTarget}
            />
          ) : (
            <BrowseView items={browseItems} onAsk={setBorrowTarget} />
          )}
        </section>
      </div>

      {/* Dialogs */}
      <BorrowDialog
        item={borrowTarget}
        onClose={() => setBorrowTarget(null)}
        onConfirm={handleBorrowConfirm}
      />
      <LendDialog open={lendOpen} onClose={() => setLendOpen(false)} onLend={handleLend} />
      <MyBorrowsSheet
        open={myBorrowsOpen}
        borrows={borrows}
        onClose={() => setMyBorrowsOpen(false)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-2 py-3 text-center backdrop-blur-sm sm:px-3">
      <div
        className="text-2xl font-bold leading-none sm:text-3xl"
        style={{ fontFamily: "'Fraunces', serif" }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-[#cfeede] sm:text-xs">
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results & browse
// ---------------------------------------------------------------------------

function ResultsView({
  result,
  onClear,
  onAsk,
}: {
  result: SearchResult;
  onClear: () => void;
  onAsk: (item: Item) => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-3 rounded-3xl bg-white p-4 shadow-md ring-1 ring-[#dcebe0] sm:p-5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: result.isExact ? "#1f6b47" : "#e8a13c" }}
        >
          {result.isExact ? <Heart className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
        <p
          className="flex-1 pt-1 text-base font-bold leading-snug text-[#143625] sm:text-lg"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {result.summary}
        </p>
        <button
          onClick={onClear}
          className="rounded-full p-1.5 text-[#7d9a8a] transition hover:bg-[#eef6f0]"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {result.results.map((item, i) => (
          <ItemCard key={item.id} item={item} onAsk={onAsk} highlight={result.isExact && i === 0} />
        ))}
      </div>
    </div>
  );
}

function BrowseView({ items, onAsk }: { items: Item[]; onAsk: (item: Item) => void }) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-[#143625]" style={{ fontFamily: "'Fraunces', serif" }}>
        On your block right now
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onAsk={onAsk} />
        ))}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  onAsk,
  highlight = false,
}: {
  item: Item;
  onAsk: (item: Item) => void;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex flex-col rounded-3xl bg-white p-4 transition hover:-translate-y-0.5"
      style={{
        boxShadow: highlight
          ? "0 18px 36px -18px rgba(31,107,71,0.55)"
          : "0 12px 28px -20px rgba(20,54,37,0.4)",
        outline: highlight ? "2px solid #1f6b47" : "1px solid #e4f0e7",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl"
          style={{ background: "linear-gradient(135deg, #eef7f0, #dcefe1)" }}
        >
          {item.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold text-[#143625]">{item.name}</h3>
            {highlight && (
              <span className="rounded-full bg-[#e7f3ec] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1f6b47]">
                Closest
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Avatar name={item.owner} size={24} />
            <span className="text-sm font-bold text-[#3f6450]">{item.owner}</span>
            <span className="text-xs font-semibold text-[#9bb3a4]">· {item.category}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-[#4f6e5d]">
            <MapPin className="h-3.5 w-3.5 text-[#8aa896]" />
            {item.distanceMi.toFixed(2)} mi · {item.distanceLabel}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-[#fff1ec] px-3 py-1 text-xs font-bold text-[#d2502f]">
          {item.availability}
        </span>
        <button
          onClick={() => onAsk(item)}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-105"
          style={{ background: "#ff6b4a", boxShadow: "0 10px 20px -8px rgba(255,107,74,0.65)" }}
        >
          Ask to borrow
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Borrow flow dialog
// ---------------------------------------------------------------------------

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function BorrowDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: Item | null;
  onClose: () => void;
  onConfirm: (b: Borrow) => void;
}) {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO(2));
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (item) {
      setFrom(todayISO());
      setTo(todayISO(2));
      setMessage("");
    }
  }, [item]);

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl border-0 sm:max-w-md" style={{ background: "#fbfdfb" }}>
        {item && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                  style={{ background: "linear-gradient(135deg, #eef7f0, #dcefe1)" }}
                >
                  {item.emoji}
                </div>
                <div className="text-left">
                  <DialogTitle
                    className="text-xl font-bold text-[#143625]"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    Borrow {item.name.toLowerCase()}
                  </DialogTitle>
                  <DialogDescription className="font-semibold text-[#5b7a68]">
                    from {item.owner} · {item.distanceLabel}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold text-[#3f6450]">
                  From
                  <input
                    type="date"
                    value={from}
                    min={todayISO()}
                    onChange={(e) => setFrom(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d4e8d9] bg-white px-3 py-2 text-sm font-semibold text-[#1d3a2c] outline-none focus:border-[#1f6b47]"
                  />
                </label>
                <label className="text-sm font-bold text-[#3f6450]">
                  Until
                  <input
                    type="date"
                    value={to}
                    min={from}
                    onChange={(e) => setTo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d4e8d9] bg-white px-3 py-2 text-sm font-semibold text-[#1d3a2c] outline-none focus:border-[#1f6b47]"
                  />
                </label>
              </div>
              <label className="block text-sm font-bold text-[#3f6450]">
                Add a note (optional)
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder={`Hi ${item.owner}! Would love to borrow this for the weekend 🙂`}
                  className="mt-1 w-full resize-none rounded-xl border border-[#d4e8d9] bg-white px-3 py-2 text-sm font-semibold text-[#1d3a2c] outline-none placeholder:text-[#9bb3a4] focus:border-[#1f6b47]"
                />
              </label>
            </div>

            <DialogFooter>
              <button
                onClick={() =>
                  onConfirm({
                    id: `${item.id}-${Date.now()}`,
                    item,
                    from,
                    to,
                    message,
                    status: "Pending",
                  })
                }
                className="w-full rounded-full px-5 py-3 text-base font-bold text-white shadow-md transition hover:brightness-105"
                style={{ background: "#ff6b4a", boxShadow: "0 12px 24px -8px rgba(255,107,74,0.65)" }}
              >
                Send request to {item.owner}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Lend an item dialog
// ---------------------------------------------------------------------------

function LendDialog({
  open,
  onClose,
  onLend,
}: {
  open: boolean;
  onClose: () => void;
  onLend: (item: Item) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [availability, setAvailability] = useState("Free this weekend");

  useEffect(() => {
    if (open) {
      setName("");
      setCategory(CATEGORIES[0]);
      setEmoji(EMOJI_CHOICES[0]);
      setAvailability("Free this weekend");
    }
  }, [open]);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give your item a name first 🙂");
      return;
    }
    const tags = trimmed.toLowerCase().split(/\s+/);
    onLend({
      id: `mine-${Date.now()}`,
      name: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
      emoji,
      category,
      tags: [trimmed.toLowerCase(), ...tags],
      owner: "You",
      distanceMi: 0,
      distanceLabel: "your place",
      availability: availability.trim() || "Available soon",
      value: 100,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl border-0 sm:max-w-md" style={{ background: "#fbfdfb" }}>
        <DialogHeader>
          <DialogTitle
            className="text-xl font-bold text-[#143625]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Lend something
          </DialogTitle>
          <DialogDescription className="font-semibold text-[#5b7a68]">
            Share what you rarely use — your block will thank you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <label className="block text-sm font-bold text-[#3f6450]">
            What is it?
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tile saw"
              className="mt-1 w-full rounded-xl border border-[#d4e8d9] bg-white px-3 py-2 text-sm font-semibold text-[#1d3a2c] outline-none placeholder:text-[#9bb3a4] focus:border-[#1f6b47]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold text-[#3f6450]">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#d4e8d9] bg-white px-3 py-2 text-sm font-semibold text-[#1d3a2c] outline-none focus:border-[#1f6b47]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-[#3f6450]">
              Availability
              <input
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder="Free this weekend"
                className="mt-1 w-full rounded-xl border border-[#d4e8d9] bg-white px-3 py-2 text-sm font-semibold text-[#1d3a2c] outline-none placeholder:text-[#9bb3a4] focus:border-[#1f6b47]"
              />
            </label>
          </div>

          <div className="text-sm font-bold text-[#3f6450]">
            Pick an icon
            <div className="mt-2 flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xl transition"
                  style={{
                    background: emoji === e ? "#1f6b47" : "#eef6f0",
                    outline: emoji === e ? "2px solid #143625" : "none",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={submit}
            className="w-full rounded-full px-5 py-3 text-base font-bold text-white shadow-md transition hover:brightness-105"
            style={{ background: "#1f6b47", boxShadow: "0 12px 24px -8px rgba(31,107,71,0.6)" }}
          >
            Add to the block
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// My borrows sheet
// ---------------------------------------------------------------------------

function MyBorrowsSheet({
  open,
  borrows,
  onClose,
}: {
  open: boolean;
  borrows: Borrow[];
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full border-0 sm:max-w-md" style={{ background: "#f4faf6" }}>
        <SheetHeader>
          <SheetTitle
            className="text-2xl font-bold text-[#143625]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            My borrows
          </SheetTitle>
          <SheetDescription className="font-semibold text-[#5b7a68]">
            Requests you've sent to neighbors.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 overflow-y-auto px-4 pb-6">
          {borrows.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-[#e4f0e7]">
              <div className="text-4xl">🧺</div>
              <p className="mt-3 font-bold text-[#143625]">No borrows yet</p>
              <p className="mt-1 text-sm font-semibold text-[#5b7a68]">
                Find something you need and tap “Ask to borrow”.
              </p>
            </div>
          ) : (
            borrows.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#e4f0e7]"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: "linear-gradient(135deg, #eef7f0, #dcefe1)" }}
                >
                  {b.item.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-[#143625]">{b.item.name}</div>
                  <div className="text-xs font-semibold text-[#5b7a68]">
                    from {b.item.owner} · {b.from} → {b.to}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                  style={
                    b.status === "Approved"
                      ? { background: "#e7f3ec", color: "#1f6b47" }
                      : { background: "#fff4e6", color: "#c47f1a" }
                  }
                >
                  {b.status}
                </span>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
