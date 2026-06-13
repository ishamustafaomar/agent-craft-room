import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicProject } from "@/lib/projects.functions";
import { LivePreview } from "@/components/workspace/live-preview";
import { BrandLogo } from "@/components/brand-logo";
import { Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/p/$projectId")({
  head: () => ({
    meta: [
      { title: "Shared app · Breezy" },
      {
        name: "description",
        content: "A web app built and shared with Breezy — the friendliest AI builder.",
      },
      { property: "og:title", content: "Built with Breezy" },
      {
        property: "og:description",
        content:
          "Explore a live, read-only web app built and shared with Breezy — the friendliest AI builder. Describe it, see it, ship it.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PublicProject,
});

function PublicProject() {
  const { projectId } = useParams({ from: "/p/$projectId" });
  const getPublic = useServerFn(getPublicProject);

  const { data, isLoading } = useQuery({
    queryKey: ["public-project", projectId],
    queryFn: () => getPublic({ data: { projectId } }),
  });

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <BrandLogo size={20} showWordmark={false} />
          <span className="text-sm font-medium">
            {data?.project?.name ?? "Shared app"}
          </span>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Build your own <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="relative flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.project ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground">
              This app is private or no longer shared.
            </p>
            <Link to="/" className="text-sm text-primary hover:underline">
              Go to Breezy
            </Link>
          </div>
        ) : (
          <LivePreview
            files={Object.fromEntries(data.files.map((f) => [f.path, f.content]))}
          />
        )}
      </div>
    </div>
  );
}
