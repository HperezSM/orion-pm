import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTierEnforcement, TierLimits } from "@/hooks/useTierEnforcement";
import {
  LayoutDashboard,
  Mail,
  Clock,
  FolderKanban,
  Building2,
  Zap,
  Calendar,
  BarChart3,
  PenLine,
  Settings,
  Users,
  ShieldCheck,
  GanttChart,
  BarChart,
  LogOut,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NavItem {
  to: string;
  icon: any;
  label: string;
  feature?: keyof TierLimits["features"];
}

const mainNav: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/inbox", icon: Mail, label: "Inbox" },
  { to: "/follow-ups", icon: Clock, label: "Follow-Ups" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/clients", icon: Building2, label: "Clients" },
  { to: "/sprints", icon: Zap, label: "Sprints" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/reports", icon: BarChart3, label: "Reports", feature: "advancedReports" },
  { to: "/notes", icon: PenLine, label: "Notes" },
  { to: "/workload", icon: BarChart, label: "Workload" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const adminNav: NavItem[] = [
  { to: "/team", icon: Users, label: "Team Overview" },
  { to: "/executive", icon: ShieldCheck, label: "Executive View", feature: "executiveView" },
  { to: "/admin-dashboard", icon: LayoutDashboard, label: "Admin Dashboard" },
  { to: "/gantt", icon: GanttChart, label: "Gantt (Global)", feature: "ganttChart" },
];

export function AppSidebar() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "See you next time!" });
    navigate("/login", { replace: true });
  };

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : profile?.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-background border-r border-border flex flex-col z-30">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border flex-shrink-0">
        <Zap className="h-5 w-5 text-primary mr-2.5 flex-shrink-0" />
        <span className="font-heading font-bold text-sm text-foreground tracking-tight">PM Command Center</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <div className="space-y-0.5">
          {mainNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
                  isActive
                    ? "bg-background-secondary text-foreground font-medium"
                    : "text-text-secondary hover:text-foreground hover:bg-background-secondary"
                }`
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">Admin</p>
            <div className="space-y-0.5">
              {adminNav.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
                      isActive
                        ? "bg-background-secondary text-foreground font-medium"
                        : "text-text-secondary hover:text-foreground hover:bg-background-secondary"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User panel + logout */}
      <div className="border-t border-border flex-shrink-0">
        <div className="p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{profile?.display_name ?? "User"}</p>
            <p className="text-[11px] text-text-muted truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors border-t border-border"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
