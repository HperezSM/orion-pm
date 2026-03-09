import { useNavigate } from "react-router-dom";
import { useTierEnforcement } from "@/hooks/useTierEnforcement";
import { Clock, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function TrialBanner() {
  const navigate = useNavigate();
  const { usage, isTrialActive, tier } = useTierEnforcement();
  const [dismissed, setDismissed] = useState(false);

  if (!isTrialActive || dismissed || tier === "free") {
    return null;
  }

  const trialEnds = usage.trialEndsAt ? new Date(usage.trialEndsAt) : null;
  if (!trialEnds) return null;

  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  const isUrgent = daysLeft <= 3;
  const bgColor = isUrgent ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30";
  const textColor = isUrgent ? "text-destructive" : "text-warning";
  const iconColor = isUrgent ? "text-destructive" : "text-warning";

  return (
    <div className={`px-4 py-2.5 border-b ${bgColor} flex items-center justify-between gap-4`}>
      <div className="flex items-center gap-3">
        <Clock className={`h-4 w-4 ${iconColor} flex-shrink-0`} />
        <p className="text-sm">
          <span className={`font-medium ${textColor}`}>
            {daysLeft === 0 ? "Trial ends today!" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
          </span>
          <span className="text-text-secondary ml-1.5">
            in your {tier} trial. Upgrade to keep all features.
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => navigate("/settings?tab=billing")}
        >
          <ArrowUpRight className="h-3 w-3" />
          Upgrade Now
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-background/50 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5 text-text-muted" />
        </button>
      </div>
    </div>
  );
}
