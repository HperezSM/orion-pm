import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TierName = "starter" | "pro" | "business" | "enterprise";

export interface TierLimits {
  seats: number;
  aiActions: number;
  storageGb: number;
  features: {
    ganttChart: boolean;
    executiveView: boolean;
    advancedReports: boolean;
    aiAnalysis: boolean;
    customIntegrations: boolean;
    apiAccess: boolean;
  };
}

const TIER_CONFIG: Record<TierName, TierLimits> = {
  starter: {
    seats: 3,
    aiActions: 100,
    storageGb: 1,
    features: {
      ganttChart: false,
      executiveView: false,
      advancedReports: false,
      aiAnalysis: false,
      customIntegrations: false,
      apiAccess: false,
    },
  },
  pro: {
    seats: 10,
    aiActions: 1000,
    storageGb: 10,
    features: {
      ganttChart: true,
      executiveView: false,
      advancedReports: true,
      aiAnalysis: true,
      customIntegrations: false,
      apiAccess: false,
    },
  },
  business: {
    seats: 50,
    aiActions: 5000,
    storageGb: 50,
    features: {
      ganttChart: true,
      executiveView: true,
      advancedReports: true,
      aiAnalysis: true,
      customIntegrations: true,
      apiAccess: false,
    },
  },
  enterprise: {
    seats: 999,
    aiActions: 99999,
    storageGb: 500,
    features: {
      ganttChart: true,
      executiveView: true,
      advancedReports: true,
      aiAnalysis: true,
      customIntegrations: true,
      apiAccess: true,
    },
  },
};

export interface WorkspaceUsage {
  tier: TierName;
  seatsUsed: number;
  aiActionsUsed: number;
  storageUsedGb: number;
  trialEndsAt: string | null;
}

export function useTierEnforcement() {
  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace-tier"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("tier, seats_used, ai_actions_used, storage_used_gb, trial_ends_at")
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  const tier: TierName = (workspace?.tier as TierName) ?? "pro";
  const limits = TIER_CONFIG[tier];

  const usage: WorkspaceUsage = {
    tier,
    seatsUsed: workspace?.seats_used ?? 1,
    aiActionsUsed: workspace?.ai_actions_used ?? 0,
    storageUsedGb: Number(workspace?.storage_used_gb ?? 0),
    trialEndsAt: workspace?.trial_ends_at ?? null,
  };

  const isTrialActive = usage.trialEndsAt ? new Date(usage.trialEndsAt) > new Date() : false;

  const canUseFeature = (feature: keyof TierLimits["features"]): boolean => {
    return limits.features[feature];
  };

  const hasReachedLimit = (resource: "seats" | "aiActions" | "storage"): boolean => {
    switch (resource) {
      case "seats":
        return usage.seatsUsed >= limits.seats;
      case "aiActions":
        return usage.aiActionsUsed >= limits.aiActions;
      case "storage":
        return usage.storageUsedGb >= limits.storageGb;
      default:
        return false;
    }
  };

  const getUsagePercent = (resource: "seats" | "aiActions" | "storage"): number => {
    switch (resource) {
      case "seats":
        return Math.min(100, Math.round((usage.seatsUsed / limits.seats) * 100));
      case "aiActions":
        return Math.min(100, Math.round((usage.aiActionsUsed / limits.aiActions) * 100));
      case "storage":
        return Math.min(100, Math.round((usage.storageUsedGb / limits.storageGb) * 100));
      default:
        return 0;
    }
  };

  const getRequiredTierForFeature = (feature: keyof TierLimits["features"]): TierName | null => {
    const tierOrder: TierName[] = ["starter", "pro", "business", "enterprise"];
    for (const t of tierOrder) {
      if (TIER_CONFIG[t].features[feature]) {
        return t;
      }
    }
    return null;
  };

  return {
    tier,
    limits,
    usage,
    isLoading,
    isTrialActive,
    canUseFeature,
    hasReachedLimit,
    getUsagePercent,
    getRequiredTierForFeature,
    tierConfig: TIER_CONFIG,
  };
}
