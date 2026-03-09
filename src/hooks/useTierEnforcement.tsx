import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TierName = "free" | "starter" | "pro" | "enterprise";

export interface TierLimits {
  users: number;
  projects: number;
  threadsPerMonth: number;
  pricePerUser: number;
  features: {
    ganttChart: boolean;
    executiveView: boolean;
    advancedReports: boolean;
    aiAnalysis: boolean;
    sprintCeremonies: boolean;
    workloadManager: boolean;
    calendarIntegration: boolean;
    approvalWorkflows: boolean;
    auditLogs: boolean;
    whiteLabel: boolean;
    pdfExport: boolean;
    followUpAutomation: boolean;
    customIntegrations: boolean;
    apiAccess: boolean;
  };
}

const TIER_CONFIG: Record<TierName, TierLimits> = {
  free: {
    users: 0,
    projects: 0,
    threadsPerMonth: 0,
    pricePerUser: 0,
    features: {
      ganttChart: false,
      executiveView: false,
      advancedReports: false,
      aiAnalysis: false,
      sprintCeremonies: false,
      workloadManager: false,
      calendarIntegration: false,
      approvalWorkflows: false,
      auditLogs: false,
      whiteLabel: false,
      pdfExport: false,
      followUpAutomation: false,
      customIntegrations: false,
      apiAccess: false,
    },
  },
  starter: {
    users: 3,
    projects: 5,
    threadsPerMonth: 50,
    pricePerUser: 19,
    features: {
      ganttChart: false,
      executiveView: false,
      advancedReports: false,
      aiAnalysis: false,
      sprintCeremonies: false,
      workloadManager: false,
      calendarIntegration: false,
      approvalWorkflows: false,
      auditLogs: false,
      whiteLabel: false,
      pdfExport: false,
      followUpAutomation: true,
      customIntegrations: false,
      apiAccess: false,
    },
  },
  pro: {
    users: 15,
    projects: 999,
    threadsPerMonth: 99999,
    pricePerUser: 29,
    features: {
      ganttChart: true,
      executiveView: false,
      advancedReports: true,
      aiAnalysis: true,
      sprintCeremonies: true,
      workloadManager: true,
      calendarIntegration: true,
      approvalWorkflows: false,
      auditLogs: false,
      whiteLabel: false,
      pdfExport: true,
      followUpAutomation: true,
      customIntegrations: false,
      apiAccess: false,
    },
  },
  enterprise: {
    users: 999,
    projects: 999,
    threadsPerMonth: 99999,
    pricePerUser: 49,
    features: {
      ganttChart: true,
      executiveView: true,
      advancedReports: true,
      aiAnalysis: true,
      sprintCeremonies: true,
      workloadManager: true,
      calendarIntegration: true,
      approvalWorkflows: true,
      auditLogs: true,
      whiteLabel: true,
      pdfExport: true,
      followUpAutomation: true,
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
    staleTime: 60000,
  });

  const tier: TierName = (workspace?.tier as TierName) ?? "free";
  const limits = TIER_CONFIG[tier];

  const usage: WorkspaceUsage = {
    tier,
    seatsUsed: workspace?.seats_used ?? 0,
    aiActionsUsed: workspace?.ai_actions_used ?? 0,
    storageUsedGb: Number(workspace?.storage_used_gb ?? 0),
    trialEndsAt: workspace?.trial_ends_at ?? null,
  };

  const isTrialActive = usage.trialEndsAt ? new Date(usage.trialEndsAt) > new Date() : false;

  const canUseFeature = (feature: keyof TierLimits["features"]): boolean => {
    return limits.features[feature];
  };

  const hasReachedLimit = (resource: "users" | "projects"): boolean => {
    switch (resource) {
      case "users":
        return usage.seatsUsed >= limits.users;
      case "projects":
        return false; // TODO: count projects
      default:
        return false;
    }
  };

  const getRequiredTierForFeature = (feature: keyof TierLimits["features"]): TierName | null => {
    const tierOrder: TierName[] = ["free", "starter", "pro", "enterprise"];
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
    getRequiredTierForFeature,
    tierConfig: TIER_CONFIG,
  };
}
