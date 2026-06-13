import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
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
        <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" /> AI coding agent · live in your browser
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Build full-stack apps by{" "}
            <span className="bg-gradient-to-r from-primary to-[oklch(0.72_0.18_300)] bg-clip-text text-transparent">
              chatting
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
            Describe what you want. The agent reasons, writes files, runs commands, and shows
            you a live preview — Lovable, Cursor, and Replit Agent in one.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to={signedIn ? "/dashboard" : "/auth"}>
              <Button size="lg" className="gap-2">
                Start building <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-medium tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          Forge AI — your AI coding agent.
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
