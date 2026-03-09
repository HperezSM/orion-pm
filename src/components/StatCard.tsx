import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: "primary" | "success" | "warning" | "destructive" | "purple" | "teal";
}

const accentMap = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
  purple: "text-purple bg-purple/10",
};

export function StatCard({ label, value, icon, accent = "primary" }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</span>
        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${accentMap[accent]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-heading font-bold text-foreground">{value}</p>
    </div>
  );
}
