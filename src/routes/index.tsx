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

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-breezy-mesh text-[oklch(0.22_0.03_280)]">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <BrandLogo size={28} />
        <nav className="flex items-center gap-2">
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
      </header>

      <main>
        {/* Dreamy pastel hero — mirrors the Breezy brand artwork */}
        <section className="relative overflow-hidden">
          {/* Floating pastel confetti */}
          <span className="absolute left-[12%] top-[22%] h-4 w-4 rounded-full bg-breezy-pink/80" />
          <span className="absolute left-[16%] top-[42%] h-7 w-7 rounded-full bg-breezy-mint/80" />
          <span className="absolute left-[9%] top-[58%] h-4 w-4 rounded-full bg-breezy-blue/80" />
          <span className="absolute left-[26%] top-[18%] h-9 w-9 rounded-xl bg-breezy-mint/70" />
          <span className="absolute right-[14%] top-[28%] h-4 w-4 rounded-full bg-breezy-pink/80" />
          <span className="absolute right-[10%] top-[44%] h-5 w-5 rounded-full bg-breezy-yellow/80" />
          <span className="absolute right-[13%] top-[60%] h-6 w-6 rounded-full bg-breezy-blue/80" />
          <span className="absolute right-[20%] bottom-[12%] h-9 w-9 rounded-xl bg-breezy-pink/60" />

          <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-24 text-center text-[oklch(0.22_0.03_280)]">
            <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[oklch(0.22_0.03_280/0.12)] bg-white/50 px-3 py-1 text-xs text-[oklch(0.34_0.03_280)] backdrop-blur">
              <Zap className="h-3.5 w-3.5 text-[oklch(0.55_0.12_300)]" /> The friendliest AI builder · live in your browser
            </div>
            <h1 className="font-display text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
              Vibe-code beautiful
              <br />
              apps in minutes
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-[oklch(0.4_0.03_280)]">
              Breezy is the friendliest AI builder for shipping web apps. Describe it,
              see it, ship it — files, commands, and a live preview, all in your browser.
            </p>
            <div className="mt-9 flex items-center justify-center gap-3">
              <Link to={signedIn ? "/dashboard" : "/auth"}>
                <Button size="lg" className="gap-2 shadow-soft">
                  Start building <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/60 bg-white/60 p-6 shadow-soft backdrop-blur transition-colors hover:border-white"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/70">
                <f.icon className="h-5 w-5 text-[oklch(0.55_0.12_300)]" />
              </div>
              <h2 className="mt-4 font-medium tracking-tight text-[oklch(0.22_0.03_280)]">{f.title}</h2>
              <p className="mt-1.5 text-sm text-[oklch(0.4_0.03_280)]">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-[oklch(0.22_0.03_280/0.1)]">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-[oklch(0.4_0.03_280)]">
          Breezy — vibe-code beautiful apps in minutes.
        </div>
      </footer>
    </div>
  );
}

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
    icon: FolderGit2,
    title: "Persistent projects",
    desc: "Every project and conversation is saved to your account.",
  },
  {
    icon: Sparkles,
    title: "Multiple models",
    desc: "Powered by leading AI models, with your own keys supported.",
  },
];
