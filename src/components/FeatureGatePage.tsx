import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTierEnforcement, TierLimits } from "@/hooks/useTierEnforcement";
import { UpgradeModal } from "./UpgradeModal";
import { Lock, ArrowLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeatureGatePageProps {
  feature: keyof TierLimits["features"];
  featureLabel: string;
  children: React.ReactNode;
}

export function FeatureGatePage({ feature, featureLabel, children }: FeatureGatePageProps) {
  const { canUseFeature, getRequiredTierForFeature, isLoading } = useTierEnforcement();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  const requiredTier = getRequiredTierForFeature(feature);

  return (
    <>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md space-y-6 p-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-warning/15 flex items-center justify-center">
            <Lock className="h-8 w-8 text-warning" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-heading font-bold text-foreground">{featureLabel}</h2>
            <p className="text-sm text-text-muted">
              This feature is available on the{" "}
              <span className="text-primary font-medium capitalize">{requiredTier}</span> plan and above.
              Upgrade to unlock it.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Go Back
            </Button>
            <Button size="sm" onClick={() => setShowUpgrade(true)}>
              <Crown className="h-3.5 w-3.5 mr-1.5" />
              Upgrade Plan
            </Button>
          </div>
        </div>
      </div>
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature={featureLabel}
        requiredTier={requiredTier ?? "pro"}
      />
    </>
  );
}
