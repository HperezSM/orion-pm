import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { pickWorkspace } from "@/lib/workspace";

export const CURRENT_WORKSPACE_KEY = ["current-workspace"] as const;

/**
 * The workspace the signed-in user is working in: the one they own, else the
 * oldest one they belong to. RLS limits the query to their workspaces (plus
 * every workspace for the platform owner, which is why .limit(1) was not safe).
 */
export function useCurrentWorkspace() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...CURRENT_WORKSPACE_KEY, user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("workspaces").select("*");
      if (error) throw error;
      return pickWorkspace(data ?? [], user?.id);
    },
  });
}
