import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Coins, Star } from "lucide-react";

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  coinBalance: number;
  pointBalance: number;
  level: number;
}

export function Navbar() {
  const [location] = useLocation();
  
  const { data: authData } = useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 0, // Always refetch auth state
    refetchOnWindowFocus: true,
  });

  const user = authData?.user;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!user || location === "/" || location === "/auth") {
    return null;
  }

  const initials = user.username
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="bg-card border-b border-border p-4" data-testid="navbar">
      <div className="container mx-auto flex items-center justify-between">
        <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>
          <h1 className="font-arcade text-xl font-bold glow-cyan cursor-pointer" data-testid="logo">
            ARCADE PAY
          </h1>
        </Link>

        <div className="flex items-center space-x-6">
          {user.role !== "admin" && (
            <>
              {/* Coin Balance */}
              <div className="text-center" data-testid="coin-balance">
                <div className="flex items-center justify-center space-x-1">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <span className="font-bold text-lg">{user.coinBalance.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">Coins</p>
              </div>

              {/* Points Balance */}
              <div className="text-center" data-testid="point-balance">
                <div className="flex items-center justify-center space-x-1">
                  <Star className="w-5 h-5 text-neon-cyan" />
                  <span className="font-bold text-lg glow-cyan">{user.pointBalance.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
            </>
          )}

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-neon-cyan to-neon-pink text-background font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="font-semibold text-sm" data-testid="username">{user.username}</p>
                <p className="text-xs text-muted-foreground">
                  {user.role === "admin" ? "Admin" : `Level ${user.level} Player`}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
