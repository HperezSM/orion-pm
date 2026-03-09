import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, ArrowUpRight, Zap, Users, HardDrive, CheckCircle2 } from "lucide-react";
import { TierName } from "@/hooks/useTierEnforcement";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  requiredTier?: TierName;
  limitType?: "seats" | "aiActions" | "storage";
}

const TIER_PRICES: Record<TierName, number> = {
  starter: 0,
  pro: 49,
  business: 149,
  enterprise: 499,
};

const TIER_FEATURES: Record<TierName, string[]> = {
  starter: ["3 seats", "100 AI actions/mo", "1 GB storage"],
  pro: ["10 seats", "1,000 AI actions/mo", "10 GB storage", "Gantt charts", "Advanced reports", "AI analysis"],
  business: ["50 seats", "5,000 AI actions/mo", "50 GB storage", "Executive view", "Custom integrations"],
  enterprise: ["Unlimited seats", "Unlimited AI actions", "500 GB storage", "API access", "Priority support"],
};

export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  requiredTier = "pro",
  limitType,
}: UpgradeModalProps) {
  const navigate = useNavigate();

  const getLimitMessage = () => {
    switch (limitType) {
      case "seats":
        return "You've reached the maximum number of team members for your plan.";
      case "aiActions":
        return "You've used all your AI actions for this billing period.";
      case "storage":
        return "You've reached your storage limit.";
      default:
        return null;
    }
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/settings?tab=billing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
              <Crown className="h-5 w-5 text-warning" />
            </div>
            <DialogTitle className="text-lg">
              {limitType ? "Limit Reached" : "Upgrade Required"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {limitType ? (
              getLimitMessage()
            ) : (
              <>
                <span className="font-medium text-foreground">{feature}</span> is available on the{" "}
                <span className="font-medium text-primary capitalize">{requiredTier}</span> plan and above.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-heading font-semibold text-foreground capitalize">{requiredTier} Plan</span>
            <span className="text-lg font-heading font-bold text-foreground">${TIER_PRICES[requiredTier]}<span className="text-xs text-text-muted font-normal">/mo</span></span>
          </div>
          <div className="space-y-1.5">
            {TIER_FEATURES[requiredTier].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade}>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
