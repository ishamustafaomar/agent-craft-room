import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

const URL = "https://breezyai.dev/blog/how-to-build-web-app-with-ai";
const TITLE = "How to Build a Web App with AI — A Vibe-Coding Guide";
const DESCRIPTION =
  "A step-by-step guide to building a web app with AI. Learn the vibe-coding workflow with Breezy — describe it, see it, ship it — from idea to live preview in minutes.";

export const Route = createFileRoute("/blog/how-to-build-web-app-with-ai")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "Breezy" },
          publisher: { "@type": "Organization", name: "Breezy" },
          mainEntityOfPage: URL,
        }),
      },
    ],
  }),
  component: GuidePage,
});

const STEPS = [
  {
    title: "1. Describe what you want to build",
    body: "Start with a plain-English prompt. Instead of scaffolding a project by hand, tell the AI what the app should do — \"a todo app with dark mode and reminders\" or \"a landing page for my bakery with an order form.\" The clearer your description, the closer the first draft lands.",
  },
  {
    title: "2. Let the agent write real files",
    body: "A vibe-coding agent doesn't just paste snippets — it creates, edits, and deletes files across a real project file system. It picks a sensible stack, wires up routing, and adds components so you have a working app, not a pile of disconnected code.",
  },
  {
    title: "3. Watch it run commands",
    body: "Dependencies install and the dev server boots in a secure in-browser sandbox. There's nothing to set up locally — no Node versions, no package managers, no terminal gymnastics. The agent handles the plumbing while you focus on the product.",
  },
  {
    title: "4. See it in a live preview",
    body: "As the agent makes changes, a live preview updates instantly. You see the real app — click through it, test the flow, and spot what to refine. This tight feedback loop is what makes vibe-coding fast.",
  },
  {
    title: "5. Iterate in conversation",
    body: "Refine by chatting: \"make the header sticky,\" \"add a dark theme,\" \"connect a database for users.\" Each request becomes a focused change you can review. Keep iterating until the app matches what's in your head.",
  },
  {
    title: "6. Ship it",
    body: "When it's ready, publish to a live URL and share it with the world — or export the code to GitHub and keep building. From first description to shipped app, the whole loop can happen in minutes.",
  },
];

function GuidePage() {
  return (
    <div className="min-h-screen bg-breezy-mesh text-[oklch(0.22_0.03_280)]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/">
          <BrandLogo size={28} />
        </Link>
        <Link to="/auth">
          <Button size="sm" className="gap-2 shadow-soft">
            Start building <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[oklch(0.4_0.03_280)] hover:text-[oklch(0.22_0.03_280)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back home
        </Link>

        <article className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-[oklch(0.55_0.12_300)]">
            Guide
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            How to build a web app with AI
          </h1>
          <p className="mt-4 text-lg text-[oklch(0.4_0.03_280)]">
            You no longer need to write boilerplate, wrestle with build tools, or
            set up a dev environment to create an app. With an AI coding agent you
            describe what you want, watch it get built, and ship it — a workflow
            we call <strong>vibe-coding</strong>. Here's how it works, end to end.
          </p>

          <div className="mt-10 space-y-8">
            {STEPS.map((step) => (
              <section key={step.title}>
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  {step.title}
                </h2>
                <p className="mt-2 text-[oklch(0.4_0.03_280)]">{step.body}</p>
              </section>
            ))}
          </div>

          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Why build apps with AI?
            </h2>
            <p className="mt-2 text-[oklch(0.4_0.03_280)]">
              Learning how to create an app used to mean months of tutorials before
              you shipped anything. AI coding agents collapse that gap: the agent
              handles the stack, the commands, and the wiring, so you can go from an
              idea to a live, shareable web app in a single sitting. It's the fastest
              way to turn "I wish this existed" into something real.
            </p>
          </section>

          <div className="mt-12 rounded-2xl border border-white/60 bg-white/60 p-8 text-center shadow-soft backdrop-blur">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Ready to vibe-code your first app?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[oklch(0.4_0.03_280)]">
              Describe it, see it, ship it — all in your browser. Breezy is the
              friendliest AI builder for shipping web apps.
            </p>
            <Link to="/auth" className="mt-6 inline-block">
              <Button size="lg" className="gap-2 shadow-soft">
                Start building free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </article>
      </main>

      <footer className="border-t border-[oklch(0.22_0.03_280/0.1)]">
        <div className="mx-auto max-w-3xl px-6 py-8 text-sm text-[oklch(0.4_0.03_280)]">
          Breezy — vibe-code beautiful apps in minutes.
        </div>
      </footer>
    </div>
  );
}
