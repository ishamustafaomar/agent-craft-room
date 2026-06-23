import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import {
  Sparkles,
  MessagesSquare,
  Code2,
  TerminalSquare,
  Zap,
  FolderGit2,
  ArrowRight,
  ArrowUpRight,
  Wand2,
  Eye,
  Github,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Breezy — Vibe-code beautiful apps in minutes" },
      {
        name: "description",
        content:
          "Breezy is the friendliest AI builder for shipping web apps. Describe it, see it, ship it — files, commands, and a live preview in your browser.",
      },
      { property: "og:title", content: "Breezy — Vibe-code beautiful apps in minutes" },
      {
        property: "og:description",
        content: "The friendliest AI builder for shipping web apps. Describe it, see it, ship it.",
      },
      { property: "og:url", content: "https://breezyai.dev/" },
    ],
    links: [{ rel: "canonical", href: "https://breezyai.dev/" }],
  }),
  component: Landing,
});

const INK = "text-[oklch(0.22_0.03_280)]";
const MUTED = "text-[oklch(0.4_0.03_280)]";
const ACCENT = "text-[oklch(0.55_0.12_300)]";

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Accepts an explicit prompt (e.g. from an example card) so it never reads a
  // stale `prompt` state value set in the same click.
  const startBuilding = (text: string = prompt) => {
    const dest = signedIn ? "/dashboard" : "/auth";
    if (text.trim()) {
      try {
        sessionStorage.setItem("breezy:firstPrompt", text.trim());
      } catch {
        /* sessionStorage may be unavailable; ignore */
      }
    }
    navigate({ to: dest });
  };

  return (
    <div className={`min-h-screen bg-breezy-mesh ${INK}`}>
      <header className="sticky top-0 z-30 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandLogo size={28} />
          <nav className="flex items-center gap-1.5">
            <a
              href="#features"
              className={`hidden rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/50 sm:block ${MUTED}`}
            >
              Features
            </a>
            <a
              href="#how"
              className={`hidden rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/50 sm:block ${MUTED}`}
            >
              How it works
            </a>
            <a
              href="#gallery"
              className={`hidden rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/50 sm:block ${MUTED}`}
            >
              Examples
            </a>
            {signedIn ? (
              <Button onClick={() => navigate({ to: "/dashboard" })} className="gap-2">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link to="/auth">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* ---- Hero with a real prompt box ---- */}
        <section className="relative overflow-hidden">
          <Confetti />
          <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-20 text-center sm:pt-28">
            <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[oklch(0.22_0.03_280/0.12)] bg-white/50 px-3 py-1 text-xs backdrop-blur">
              <Zap className={`h-3.5 w-3.5 ${ACCENT}`} />
              <span className={MUTED}>The friendliest AI builder · live in your browser</span>
            </div>
            <h1 className="font-display text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
              Vibe-code beautiful
              <br />
              apps in minutes
            </h1>
            <p className={`mx-auto mt-6 max-w-xl text-balance text-lg ${MUTED}`}>
              Describe what you want to build. Breezy writes the code, runs it, and shows you a live
              preview — all in your browser, no setup required.
            </p>

            {/* Prompt box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startBuilding();
              }}
              className="mx-auto mt-9 max-w-2xl"
            >
              <div className="group flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 text-left shadow-soft backdrop-blur transition-shadow focus-within:shadow-[0_24px_70px_-22px_oklch(0.55_0.12_300/0.45)] sm:flex-row sm:items-center">
                <Wand2 className={`ml-2 hidden h-5 w-5 shrink-0 sm:block ${ACCENT}`} />
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Build a personal finance tracker with charts…"
                  aria-label="Describe the app you want to build"
                  className={`min-w-0 flex-1 bg-transparent px-2 py-2 text-base outline-none placeholder:text-[oklch(0.6_0.02_280)] ${INK}`}
                />
                <Button type="submit" size="lg" className="gap-2 shadow-soft">
                  Start building <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* Prompt suggestions */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className={`rounded-full border border-[oklch(0.22_0.03_280/0.12)] bg-white/40 px-3 py-1.5 text-xs transition-colors hover:border-white hover:bg-white/70 ${MUTED}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Product preview mockup */}
          <div className="relative mx-auto -mb-16 max-w-5xl px-6">
            <PreviewMock />
          </div>
        </section>

        {/* ---- How it works ---- */}
        <section id="how" className="mx-auto max-w-5xl px-6 pb-24 pt-32">
          <SectionHeading
            eyebrow="How it works"
            title="From idea to live app in three steps"
            subtitle="No boilerplate, no local setup. Just describe, watch, and ship."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-2xl border border-white/60 bg-white/60 p-6 shadow-soft backdrop-blur"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-sm font-semibold">
                    {i + 1}
                  </span>
                  <step.icon className={`h-5 w-5 ${ACCENT}`} />
                </div>
                <h3 className="mt-4 font-medium tracking-tight">{step.title}</h3>
                <p className={`mt-1.5 text-sm ${MUTED}`}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Features ---- */}
        <section id="features" className="mx-auto max-w-5xl px-6 pb-24">
          <SectionHeading
            eyebrow="Everything included"
            title="A real engineering workspace, powered by AI"
            subtitle="Breezy isn't a toy. It writes real files, runs real commands, and ships real apps."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/60 bg-white/60 p-6 shadow-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/70 transition-transform group-hover:scale-105">
                  <f.icon className={`h-5 w-5 ${ACCENT}`} />
                </div>
                <h3 className="mt-4 font-medium tracking-tight">{f.title}</h3>
                <p className={`mt-1.5 text-sm ${MUTED}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- What you can build ---- */}
        <section id="gallery" className="mx-auto max-w-5xl px-6 pb-24">
          <SectionHeading
            eyebrow="Endless possibilities"
            title="What will you build today?"
            subtitle="Landing pages, dashboards, tools, games — pick a starting point or describe your own."
          />
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GALLERY.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => startBuilding(item.prompt)}
                className="group overflow-hidden rounded-2xl border border-white/60 bg-white/60 text-left shadow-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium tracking-tight">{item.title}</h3>
                    <p className={`truncate text-sm ${MUTED}`}>{item.desc}</p>
                  </div>
                  <ArrowUpRight
                    className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${ACCENT}`}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ---- Closing CTA ---- */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/60 px-6 py-16 text-center shadow-soft backdrop-blur">
            <Confetti subtle />
            <h2 className="font-display relative text-4xl font-semibold tracking-tight sm:text-5xl">
              Your next app is one
              <br className="hidden sm:block" /> sentence away
            </h2>
            <p className={`relative mx-auto mt-4 max-w-md ${MUTED}`}>
              Start free, build in your browser, and watch it come to life in real time.
            </p>
            <div className="relative mt-8 flex items-center justify-center gap-3">
              <Link to={signedIn ? "/dashboard" : "/auth"}>
                <Button size="lg" className="gap-2 shadow-soft">
                  Start building free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[oklch(0.22_0.03_280/0.1)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <BrandLogo size={24} />
          <p className={`text-sm ${MUTED}`}>Vibe-code beautiful apps in minutes.</p>
          <div className={`flex items-center gap-4 text-sm ${MUTED}`}>
            <a href="#features" className="transition-colors hover:text-[oklch(0.22_0.03_280)]">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-[oklch(0.22_0.03_280)]">
              How it works
            </a>
            <a href="#gallery" className="transition-colors hover:text-[oklch(0.22_0.03_280)]">
              Examples
            </a>
            <Link to="/auth" className="transition-colors hover:text-[oklch(0.22_0.03_280)]">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className={`text-xs font-medium uppercase tracking-[0.18em] ${ACCENT}`}>{eyebrow}</span>
      <h2 className="font-display mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className={`mt-3 text-balance ${MUTED}`}>{subtitle}</p>
    </div>
  );
}

/** Floating pastel confetti used in hero and CTA. */
function Confetti({ subtle = false }: { subtle?: boolean }) {
  const o = subtle ? "/50" : "/80";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className={`absolute left-[12%] top-[22%] h-4 w-4 rounded-full bg-breezy-pink${o}`} />
      <span className={`absolute left-[16%] top-[52%] h-7 w-7 rounded-full bg-breezy-mint${o}`} />
      <span className={`absolute left-[8%] top-[72%] h-4 w-4 rounded-full bg-breezy-blue${o}`} />
      <span className={`absolute left-[26%] top-[14%] h-9 w-9 rounded-xl bg-breezy-mint/70`} />
      <span className={`absolute right-[14%] top-[24%] h-4 w-4 rounded-full bg-breezy-pink${o}`} />
      <span className={`absolute right-[9%] top-[48%] h-5 w-5 rounded-full bg-breezy-yellow${o}`} />
      <span className={`absolute right-[13%] top-[68%] h-6 w-6 rounded-full bg-breezy-blue${o}`} />
      <span className={`absolute right-[22%] bottom-[10%] h-9 w-9 rounded-xl bg-breezy-pink/60`} />
    </div>
  );
}

/** A stylized browser window showing the chat + live-preview split. */
function PreviewMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_40px_120px_-40px_oklch(0.55_0.12_300/0.55)] backdrop-blur">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-[oklch(0.22_0.03_280/0.08)] bg-white/60 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-breezy-pink" />
        <span className="h-3 w-3 rounded-full bg-breezy-yellow" />
        <span className="h-3 w-3 rounded-full bg-breezy-mint" />
        <div className={`ml-3 flex-1 truncate rounded-md bg-white/70 px-3 py-1 text-xs ${MUTED}`}>
          breezy · finance-tracker
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Chat side */}
        <div className="space-y-3 border-b border-[oklch(0.22_0.03_280/0.08)] p-5 sm:border-b-0 sm:border-r">
          <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-[oklch(0.55_0.12_300/0.12)] px-3.5 py-2 text-sm">
            Build a finance tracker with a balance card and a spending chart.
          </div>
          <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white/80 px-3.5 py-2 text-sm shadow-sm">
            On it — scaffolding the dashboard and wiring up the chart now.
          </div>
          <div className={`flex items-center gap-2 text-xs ${MUTED}`}>
            <Code2 className="h-3.5 w-3.5" /> Edited{" "}
            <code className="text-[oklch(0.22_0.03_280)]">src/App.tsx</code>
          </div>
          <div className={`flex items-center gap-2 text-xs ${MUTED}`}>
            <TerminalSquare className="h-3.5 w-3.5" /> Installed{" "}
            <code className="text-[oklch(0.22_0.03_280)]">recharts</code>
          </div>
          <div className={`flex items-center gap-2 text-xs ${ACCENT}`}>
            <Eye className="h-3.5 w-3.5" /> Live preview updated
          </div>
        </div>
        {/* Preview side */}
        <div className="bg-gradient-to-br from-white/60 to-white/30 p-5">
          <div className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm">
            <p className={`text-xs ${MUTED}`}>Total balance</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">$12,480.50</p>
            <div className="mt-4 flex h-24 items-end gap-1.5">
              {[40, 65, 50, 80, 60, 95, 72, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-[oklch(0.7_0.12_300)]"
                  style={{ height: `${h}%`, opacity: 0.55 + i * 0.05 }}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-breezy-mint/40 p-3">
                <p className={`text-[11px] ${MUTED}`}>Income</p>
                <p className="text-sm font-semibold">$6,200</p>
              </div>
              <div className="rounded-lg bg-breezy-pink/40 p-3">
                <p className={`text-[11px] ${MUTED}`}>Spending</p>
                <p className="text-sm font-semibold">$3,910</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "A landing page for a coffee brand",
  "A SaaS dashboard with charts",
  "A todo app with dark mode",
  "A portfolio site",
];

const GALLERY = [
  {
    title: "Marketing site",
    desc: "Hero, features, pricing & CTA",
    prompt:
      "Build a modern marketing landing page with a hero, feature grid, pricing, and a call to action.",
    image:
      "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Analytics dashboard",
    desc: "Charts, stats & a sidebar",
    prompt: "Build a SaaS analytics dashboard with a sidebar, KPI stat cards, and a few charts.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Online store",
    desc: "Product grid & cart",
    prompt:
      "Build an e-commerce storefront with a product grid, product detail view, and a shopping cart.",
    image:
      "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Recipe app",
    desc: "Search, filters & details",
    prompt: "Build a recipe app with search, category filters, and a detailed recipe view.",
    image:
      "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Portfolio",
    desc: "Showcase your work",
    prompt:
      "Build a sleek personal portfolio site with an about section, a project gallery, and contact links.",
    image:
      "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Browser game",
    desc: "Canvas & game loop",
    prompt: "Build a simple, fun browser game on a canvas with a score and increasing difficulty.",
    image:
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80",
  },
];

const STEPS = [
  {
    icon: MessagesSquare,
    title: "Describe it",
    desc: "Tell Breezy what you want in plain language. Refine it together in a back-and-forth chat.",
  },
  {
    icon: Wand2,
    title: "Watch it build",
    desc: "The agent writes real files, installs packages, and runs your app — step by step, in front of you.",
  },
  {
    icon: ArrowUpRight,
    title: "Ship it",
    desc: "Preview live, export to GitHub, and keep iterating. Every project is saved to your account.",
  },
];

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "Streaming agent",
    desc: "Real-time, tool-calling AI that reasons through your request step by step.",
  },
  {
    icon: Code2,
    title: "Writes real files",
    desc: "Creates, edits, and deletes files across a true project file system.",
  },
  {
    icon: TerminalSquare,
    title: "Runs commands",
    desc: "Installs dependencies and runs builds in a secure in-browser sandbox.",
  },
  {
    icon: Zap,
    title: "Live preview",
    desc: "See your app update instantly as the agent makes changes.",
  },
  {
    icon: Github,
    title: "Export to GitHub",
    desc: "Push your project to a repo in one click and take the code anywhere.",
  },
  {
    icon: FolderGit2,
    title: "Persistent projects",
    desc: "Every project and conversation is saved to your account.",
  },
  {
    icon: Sparkles,
    title: "Multiple models",
    desc: "Powered by leading AI models — Gemini, GPT, and Claude — with smart auto-selection.",
  },
  {
    icon: Eye,
    title: "Design-grade output",
    desc: "Apps come out polished and responsive by default, not bare-bones wireframes.",
  },
  {
    icon: Wand2,
    title: "Plan & Ask modes",
    desc: "Think through an approach or ask questions before a single line is written.",
  },
];
