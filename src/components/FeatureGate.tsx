import { useState, ReactNode } from "react";
import { useTierEnforcement, TierLimits } from "@/hooks/useTierEnforcement";
import { UpgradeModal } from "./UpgradeModal";
import { Lock } from "lucide-react";

interface FeatureGateProps {
  feature: keyof TierLimits["features"];
  featureLabel: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, featureLabel, children, fallback }: FeatureGateProps) {
  const { canUseFeature, getRequiredTierForFeature } = useTierEnforcement();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const hasAccess = canUseFeature(feature);
  const requiredTier = getRequiredTierForFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div
        onClick={() => setShowUpgrade(true)}
        className="relative cursor-pointer group"
      >
        <div className="opacity-50 pointer-events-none blur-[1px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
          <div className="flex flex-col items-center gap-2 text-center p-4">
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
              <Lock className="h-5 w-5 text-warning" />
            </div>
            <p className="text-sm font-medium text-foreground">{featureLabel}</p>
            <p className="text-xs text-text-muted">
              Available on <span className="text-primary capitalize">{requiredTier}</span> and above
            </p>
          </div>
        </div>
      </div>
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature={featureLabel}
        requiredTier={requiredTier ?? "starter"}
      />
    </>
  );
}

interface LimitGateProps {
  resource: "users" | "projects";
  children: ReactNode;
  onLimitReached?: () => void;
}

export function LimitGate({ resource, children, onLimitReached }: LimitGateProps) {
  const { hasReachedLimit, tier } = useTierEnforcement();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const limitReached = hasReachedLimit(resource);

  const handleClick = (e: React.MouseEvent) => {
    if (limitReached) {
      e.preventDefault();
      e.stopPropagation();
      setShowUpgrade(true);
      onLimitReached?.();
    }
  };

  return (
    <>
      <div onClick={handleClick} className={limitReached ? "cursor-not-allowed" : ""}>
        <div className={limitReached ? "opacity-50 pointer-events-none" : ""}>
          {children}
        </div>
      </div>
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        limitType={resource}
        requiredTier={tier === "free" ? "starter" : tier === "starter" ? "pro" : "enterprise"}
      />
    </>
  );
}
