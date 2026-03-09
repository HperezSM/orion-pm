import { Bell, Search, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

const impersonateRoles = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "pm", label: "PM" },
  { value: "team_member", label: "Team Member" },
] as const;

export function TopBar({ title, subtitle }: TopBarProps) {
  const { isOwner, impersonatingRole, setImpersonatingRole, roles } = useAuth();
  const realIsOwner = roles.includes("owner" as any);

  return (
    <>
      {/* Impersonation banner */}
      {impersonatingRole && (
        <div className="h-8 bg-destructive flex items-center justify-center gap-3 text-destructive-foreground text-xs font-medium">
          <span>Impersonating <strong className="uppercase">{impersonatingRole.replace("_", " ")}</strong></span>
          <button
            onClick={() => setImpersonatingRole(null)}
            className="underline hover:no-underline"
          >
            Exit
          </button>
        </div>
      )}

      <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background flex-shrink-0">
        <div>
          <h1 className="text-base font-heading font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {/* Owner crown + impersonation */}
          {realIsOwner && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-md border border-warning/30 bg-warning/10 flex items-center justify-center text-warning hover:bg-warning/20 transition-colors">
                      <Crown className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Owner Account</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">View as Role</p>
                <DropdownMenuSeparator />
                {impersonateRoles.map((r) => (
                  <DropdownMenuItem
                    key={r.value}
                    onClick={() => setImpersonatingRole(r.value as any)}
                    className={impersonatingRole === r.value ? "bg-accent" : ""}
                  >
                    {r.label}
                  </DropdownMenuItem>
                ))}
                {impersonatingRole && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setImpersonatingRole(null)} className="text-destructive">
                      Exit Impersonation
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-text-secondary hover:text-foreground hover:bg-background-secondary transition-colors">
            <Search className="h-4 w-4" />
          </button>
          <button className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-text-secondary hover:text-foreground hover:bg-background-secondary transition-colors relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">3</span>
          </button>
        </div>
      </header>
    </>
  );
}
