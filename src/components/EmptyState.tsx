import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="h-14 w-14 rounded-xl bg-background-secondary border border-border flex items-center justify-center text-text-muted mb-4">
        {icon}
      </div>
      <h3 className="text-base font-heading font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm text-center mb-4">{description}</p>
      {action}
    </div>
  );
}
