interface StatusBadgeProps {
  status: "low" | "medium" | "high" | "on-track" | "at-risk" | "blocked" | "done" | "in-progress" | "todo" | "waiting";
  label?: string;
}

const styles: Record<string, string> = {
  low: "bg-success/15 text-success",
  "on-track": "bg-success/15 text-success",
  done: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning",
  "at-risk": "bg-warning/15 text-warning",
  "in-progress": "bg-primary/15 text-primary",
  todo: "bg-muted text-text-secondary",
  waiting: "bg-purple/15 text-purple",
  high: "bg-destructive/15 text-destructive",
  blocked: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[status] || styles.todo}`}>
      {label || status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
    </span>
  );
}
