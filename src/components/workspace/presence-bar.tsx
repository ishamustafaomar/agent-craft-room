import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Peer {
  userId: string;
  name: string;
  color: string;
}

const COLORS = ["#2dd4bf", "#6366f1", "#f59e0b", "#ec4899", "#10b981", "#f43f5e"];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

/**
 * Realtime presence for a project. Joins a per-project channel and shows avatars
 * of everyone currently viewing the workspace.
 */
export function PresenceBar({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [peers, setPeers] = useState<Peer[]>([]);

  useEffect(() => {
    if (!user) return;
    const name =
      (user.user_metadata?.display_name as string) ||
      (user.user_metadata?.full_name as string) ||
      user.email?.split("@")[0] ||
      "Guest";

    const channel = supabase.channel(`project:${projectId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string }>();
        const list: Peer[] = Object.entries(state).map(([userId, metas]) => ({
          userId,
          name: metas[0]?.name ?? "Guest",
          color: colorFor(userId),
        }));
        setPeers(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user]);

  // Only render when more than just yourself is present.
  if (peers.length <= 1) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-1.5">
        {peers.slice(0, 5).map((p) => (
          <Tooltip key={p.userId}>
            <TooltipTrigger asChild>
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.name.slice(0, 1).toUpperCase()}
              </span>
            </TooltipTrigger>
            <TooltipContent>{p.name}</TooltipContent>
          </Tooltip>
        ))}
        {peers.length > 5 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
            +{peers.length - 5}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
