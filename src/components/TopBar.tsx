import { Bell, Search } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background flex-shrink-0">
      <div>
        <h1 className="text-base font-heading font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-text-secondary hover:text-foreground hover:bg-background-secondary transition-colors">
          <Search className="h-4 w-4" />
        </button>
        <button className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-text-secondary hover:text-foreground hover:bg-background-secondary transition-colors relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">3</span>
        </button>
      </div>
    </header>
  );
}
