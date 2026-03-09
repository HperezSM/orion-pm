import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Check, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const tiers = [
  {
    name: "Starter",
    monthlyPrice: 19,
    annualPrice: 15,
    description: "For freelance PMs and solo consultants getting started.",
    limits: ["Up to 3 users", "5 active projects", "3 active clients", "50 Gmail threads/mo", "100 AI actions/mo", "1 GB storage"],
    features: [
      { label: "Dashboard (PM view)", included: true },
      { label: "Inbox (Gmail, limited)", included: true },
      { label: "Follow-Ups (manual only)", included: true },
      { label: "Projects (Kanban + List)", included: true },
      { label: "Tasks (no story points)", included: true },
      { label: "Basic sprint board", included: true },
      { label: "Notes (no AI analysis)", included: true },
      { label: "Calendar (read-only)", included: true },
      { label: "Email reports (weekly)", included: true },
      { label: "Executive view", included: false },
      { label: "Gantt & Timeline", included: false },
      { label: "Sprint ceremonies", included: false },
      { label: "Workload manager", included: false },
      { label: "PDF export", included: false },
      { label: "Approval workflows", included: false },
      { label: "AI note analysis", included: false },
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Pro",
    monthlyPrice: 29,
    annualPrice: 23,
    description: "For agency PMs, small teams, and growing consultancies.",
    badge: "Most Popular",
    limits: ["Up to 15 users", "Unlimited projects", "Unlimited clients", "Unlimited Gmail threads", "500 AI actions/mo", "10 GB storage"],
    features: [
      { label: "Everything in Starter", included: true },
      { label: "Full Gmail parsing", included: true },
      { label: "Follow-up automation", included: true },
      { label: "Sprint ceremonies", included: true },
      { label: "Story points", included: true },
      { label: "Gantt & Timeline", included: true },
      { label: "PDF export", included: true },
      { label: "AI note analysis", included: true },
      { label: "Workload manager", included: true },
      { label: "Calendar (full)", included: true },
      { label: "Daily + weekly reports", included: true },
      { label: "Risk register", included: true },
      { label: "Approval workflows", included: true },
      { label: "Activity logs", included: true },
      { label: "Executive view", included: false },
      { label: "Custom report builder", included: false },
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: 49,
    annualPrice: 39,
    description: "For IT directors and enterprise PMOs running multi-team programs.",
    limits: ["Unlimited users", "Unlimited everything", "2,000 AI actions/mo", "100 GB storage", "Custom domain", "White-label ready"],
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Super Admin + Admin roles", included: true },
      { label: "Executive view & C-level reports", included: true },
      { label: "Risk heatmap (cross-project)", included: true },
      { label: "PM performance matrix", included: true },
      { label: "Sprint velocity trends", included: true },
      { label: "Resource utilization dashboard", included: true },
      { label: "Custom report builder", included: true },
      { label: "Audit logs + compliance export", included: true },
      { label: "Priority support (24h SLA)", included: true },
      { label: "Custom onboarding session", included: true },
      { label: "SSO ready", included: true },
    ],
    cta: "Contact Us",
    highlight: false,
  },
];

const faqs = [
  {
    q: "What happens after the trial ends?",
    a: "After 14 days your account becomes read-only. You can still view all your data, but you won't be able to create or edit anything until you upgrade. Data is retained for 30 days after expiry.",
  },
  {
    q: "Can I change tiers?",
    a: "Yes! You can upgrade or downgrade at any time from Settings → Billing. Changes take effect immediately for upgrades. Downgrades apply at the end of the current billing period.",
  },
  {
    q: "How are AI actions counted?",
    a: "Each AI analysis, extraction, or automated suggestion counts as one action. Actions are counted per workspace per billing cycle. Enterprise tier includes overage at $0.02/action.",
  },
  {
    q: "Is there a refund policy?",
    a: "We offer a full refund within the first 7 days of a paid subscription. After that, you can cancel and continue using the service until the end of your billing period.",
  },
  {
    q: "Can I add more users mid-cycle?",
    a: "Absolutely. New seats are prorated for the remainder of your billing period. You'll only pay for the days remaining in the current cycle.",
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm text-foreground tracking-tight">PM Command Center</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          14-day free trial on every tier. No credit card required. Cancel anytime.
        </p>

        {/* Toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-sm ${!annual ? "text-foreground font-medium" : "text-muted-foreground"}`}>Monthly</span>
          <Switch checked={annual} onCheckedChange={setAnnual} />
          <span className={`text-sm ${annual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            Annual <span className="text-xs text-primary font-semibold ml-1">Save 20%</span>
          </span>
        </div>
      </section>

      {/* Tier cards */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-xl border p-6 flex flex-col ${
                tier.highlight
                  ? "border-primary bg-primary/[0.03] shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider">
                  {tier.badge}
                </div>
              )}

              <h2 className="text-lg font-bold text-foreground">{tier.name}</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tier.description}</p>

              <div className="mt-5">
                <span className="text-4xl font-extrabold text-foreground">
                  ${annual ? tier.annualPrice : tier.monthlyPrice}
                </span>
                <span className="text-sm text-muted-foreground ml-1">/user/mo</span>
              </div>

              <Button
                className={`mt-5 w-full ${tier.highlight ? "" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
                variant={tier.highlight ? "default" : "secondary"}
                onClick={() => {
                  if (tier.name === "Enterprise") {
                    window.location.href = "mailto:gixo12l@gmail.com?subject=Enterprise%20Inquiry";
                  } else {
                    navigate("/login");
                  }
                }}
              >
                {tier.cta}
              </Button>

              {/* Limits */}
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Limits</p>
                <ul className="space-y-1.5">
                  {tier.limits.map((l) => (
                    <li key={l} className="text-xs text-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span> {l}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Features */}
              <div className="mt-5 pt-4 border-t border-border flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Features</p>
                <ul className="space-y-1.5">
                  {tier.features.map((f) => (
                    <li key={f.label} className="text-xs flex items-start gap-2">
                      {f.included ? (
                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                      ) : (
                        <Minus className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground hover:bg-background-secondary transition-colors"
              >
                {faq.q}
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} PM Command Center. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
