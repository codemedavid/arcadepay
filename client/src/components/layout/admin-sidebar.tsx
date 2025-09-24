import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Users, 
  Gift, 
  Award,
  TrendingUp, 
  Plus,
  LogOut 
} from "lucide-react";

const sidebarItems = [
  { id: "overview", label: "Overview", icon: BarChart3, href: "/admin" },
  { id: "users", label: "Users", icon: Users, href: "/admin/users" },
  { id: "promotions", label: "Promotions", icon: Gift, href: "/admin/promotions" },
  { id: "rewards", label: "Rewards", icon: Award, href: "/admin/rewards" },
  { id: "claim-rewards", label: "Claim Rewards", icon: Gift, href: "/admin/claim-rewards" },
  { id: "sales", label: "Sales Reports", icon: TrendingUp, href: "/admin/sales" },
  { id: "topup", label: "Top-Up", icon: Plus, href: "/admin/topup" },
];

export function AdminSidebar() {
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col" data-testid="admin-sidebar">
      <div className="p-6">
        <h1 className="font-arcade text-xl font-bold glow-pink" data-testid="admin-panel-title">
          ADMIN PANEL
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <Link key={item.id} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left",
                  isActive && "bg-neon-cyan/20 text-neon-cyan"
                )}
                data-testid={`sidebar-${item.id}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
          data-testid="admin-logout-button"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
