import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  Users, 
  Banknote, 
  Gift, 
  Clock, 
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Star,
  Award,
  UserCog,
  Eye,
  RotateCcw,
  Ban,
  Edit,
  Trash2,
  Search,
  Download,
  Plus
} from "lucide-react";

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  averageTransaction: number;
}

interface User {
  id: string;
  email: string;
  username: string;
  coinBalance: number;
  pointBalance: number;
  level: number;
  role: string;
}

interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount?: string;
  coinsAdded: number;
  pointsEarned: number;
  description: string;
  status: string;
  createdAt: string;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: string;
  value: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  emoji: string;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  pointsRequired: number;
  stock: number;
  isActive: boolean;
  category: string;
  emoji?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Safely format currency values that may be strings from the backend
  const formatMoney = (value: unknown) => {
    const num = typeof value === "number" ? value : parseFloat(String(value ?? 0));
    if (Number.isNaN(num)) return "0.00";
    return num.toFixed(2);
  };

  // Auth check (admin guard)
  const { data: authData, isLoading: authLoading } = useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (authLoading) return;
    const user = authData?.user;
    if (!user) {
      setLocation("/auth");
      return;
    }
    if (user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [authLoading, authData, setLocation]);

  // Determine current section from URL
  const getCurrentSection = () => {
    if (location === "/admin") return "overview";
    if (location.includes("/users")) return "users";
    if (location.includes("/promotions")) return "promotions";
    if (location.includes("/rewards") && !location.includes("/claim-rewards")) return "rewards";
    if (location.includes("/claim-rewards")) return "claim-rewards";
    if (location.includes("/sales")) return "sales";
    if (location.includes("/topup")) return "topup";
    return "overview";
  };

  const currentSection = getCurrentSection();

  // Queries
  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentSection === "users" || currentSection === "topup",
  });

  // Sales filters state
  const [timeframe, setTimeframe] = useState<string>("7days");
  const [salesFilters, setSalesFilters] = useState<{ startDate?: string; endDate?: string; type?: string; status?: string; userId?: string }>({});

  const salesQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined = now;

    if (timeframe === "today") {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
    } else if (timeframe === "7days") {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
    } else if (timeframe === "30days") {
      start = new Date(now);
      start.setDate(start.getDate() - 30);
    } else if (timeframe === "custom") {
      if (salesFilters.startDate) params.set("startDate", salesFilters.startDate);
      if (salesFilters.endDate) params.set("endDate", salesFilters.endDate);
    }

    if (timeframe !== "custom") {
      if (start) params.set("startDate", start.toISOString());
      if (end) params.set("endDate", end.toISOString());
    }

    if (salesFilters.type) params.set("type", salesFilters.type);
    if (salesFilters.status) params.set("status", salesFilters.status);
    if (salesFilters.userId) params.set("userId", salesFilters.userId);

    const qs = params.toString();
    return `/api/admin/transactions${qs ? `?${qs}` : ""}`;
  }, [timeframe, salesFilters.startDate, salesFilters.endDate, salesFilters.type, salesFilters.status, salesFilters.userId]);

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: [salesQueryUrl],
    enabled: currentSection === "sales",
  });

  const { data: promotions = [], isLoading: promotionsLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/admin/promotions"],
    enabled: currentSection === "promotions",
  });

  const { data: rewards = [], isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/admin/rewards"],
    enabled: currentSection === "rewards" || currentSection === "claim-rewards",
  });

  // Top-up form state
  const [topupForm, setTopupForm] = useState({
    userId: "",
    coins: "",
    amount: "",
    reason: "",
  });

  const computedPoints = Math.floor((parseFloat(topupForm.amount || "0") || 0) / 50);

  // Claim reward form state
  const [claimRewardForm, setClaimRewardForm] = useState({
    userId: "",
    rewardId: "",
  });

  // Promotion form state
  const [promotionForm, setPromotionForm] = useState({
    title: "",
    description: "",
    type: "bonus_points",
    value: "",
    startDate: "",
    endDate: "",
    emoji: "🎮",
  });

  // Mutations
  const topupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/topup", data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Top-up Successful",
        description: data.message,
      });
      setTopupForm({ userId: "", coins: "", amount: "", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: async (error: any) => {
      const errorData = await error.response?.json?.() || { message: "Top-up failed" };
      toast({
        title: "Error",
        description: errorData.message,
        variant: "destructive",
      });
    },
  });

  const createPromotionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/promotions", data);
    },
    onSuccess: () => {
      toast({
        title: "Promotion Created",
        description: "New promotion has been created successfully",
      });
      setPromotionForm({
        title: "",
        description: "",
        type: "bonus_points",
        value: "",
        startDate: "",
        endDate: "",
        emoji: "🎮",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
    },
    onError: async (error: any) => {
      const errorData = await error.response?.json?.() || { message: "Failed to create promotion" };
      toast({
        title: "Error",
        description: errorData.message,
        variant: "destructive",
      });
    },
  });

  const claimRewardMutation = useMutation({
    mutationFn: async (data: { userId: string; rewardId: string }) => {
      return await apiRequest("POST", "/api/admin/rewards/claim", data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Reward Claimed Successfully",
        description: `Reward "${data.redemption.reward.title}" has been claimed for user ${data.redemption.user.username}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards/redemptions"] });
      setClaimRewardForm({ userId: "", rewardId: "" });
    },
    onError: async (error: any) => {
      const errorData = await error.response?.json?.() || { message: "Failed to claim reward" };
      toast({
        title: "Error",
        description: errorData.message,
        variant: "destructive",
      });
    },
  });

  const handleTopupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupForm.userId || (!topupForm.coins && !topupForm.amount)) {
      toast({
        title: "Validation Error",
        description: "Please select a user and specify amount and/or coins",
        variant: "destructive",
      });
      return;
    }
    topupMutation.mutate({
      userId: topupForm.userId,
      coins: topupForm.coins,
      amount: topupForm.amount,
      reason: topupForm.reason,
    });
  };

  const handlePromotionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...promotionForm,
      value: parseInt(promotionForm.value),
      startDate: new Date(promotionForm.startDate),
      endDate: new Date(promotionForm.endDate),
    };
    
    createPromotionMutation.mutate(data);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" data-testid="admin-dashboard">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        {/* Overview Section */}
        {currentSection === "overview" && (
          <div className="p-6" data-testid="admin-overview">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-arcade text-3xl font-bold glow-green">Dashboard Overview</h2>
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* Stats Cards */}
            {analyticsLoading ? (
              <div className="flex justify-center mb-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="card-glow" data-testid="stat-total-users">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Users</p>
                        <p className="text-2xl font-bold glow-cyan">{analytics?.totalUsers || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-neon-cyan/20 rounded-lg flex items-center justify-center">
                        <Users className="text-neon-cyan text-xl" />
                      </div>
                    </div>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-neon-green mr-1" />
                      <span className="text-neon-green text-sm">Active platform</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-glow" data-testid="stat-total-revenue">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Revenue</p>
                        <p className="text-2xl font-bold glow-cyan">
                          ₱{formatMoney(analytics?.totalRevenue)}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-neon-pink/20 rounded-lg flex items-center justify-center">
                        <Banknote className="text-neon-pink text-xl" />
                      </div>
                    </div>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-neon-green mr-1" />
                      <span className="text-neon-green text-sm">Growing revenue</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-glow" data-testid="stat-total-transactions">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Transactions</p>
                        <p className="text-2xl font-bold glow-cyan">{analytics?.totalTransactions || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-neon-green/20 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="text-neon-green text-xl" />
                      </div>
                    </div>
                    <div className="flex items-center mt-2">
                      <Clock className="w-4 h-4 text-muted-foreground mr-1" />
                      <span className="text-muted-foreground text-sm">All time</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-glow" data-testid="stat-avg-transaction">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Avg Transaction</p>
                        <p className="text-2xl font-bold glow-cyan">
                          ₱{formatMoney(analytics?.averageTransaction)}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-neon-purple/20 rounded-lg flex items-center justify-center">
                        <TrendingUp className="text-neon-purple text-xl" />
                      </div>
                    </div>
                    <div className="flex items-center mt-2">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-yellow-400 text-sm">Per transaction</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Activity Feed */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground" data-testid="activity-placeholder">
                  <Clock className="w-12 h-12 mx-auto mb-4" />
                  <p>Real-time activity feed will appear here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Section */}
        {currentSection === "users" && (
          <div className="p-6" data-testid="admin-users">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-arcade text-3xl font-bold glow-green">User Management</h2>
              <div className="flex space-x-4">
                <Input
                  placeholder="Search users..."
                  className="w-64"
                  data-testid="search-users"
                />
                <Button variant="outline" data-testid="search-button">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {usersLoading ? (
              <div className="flex justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <Card className="card-glow">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="text-left p-4">User</th>
                          <th className="text-left p-4">Email</th>
                          <th className="text-left p-4">Coin Balance</th>
                          <th className="text-left p-4">Point Balance</th>
                          <th className="text-left p-4">Level</th>
                          <th className="text-left p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {users.map((user) => (
                          <tr key={user.id} data-testid={`user-row-${user.id}`}>
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-neon-cyan to-neon-pink rounded-full flex items-center justify-center text-sm font-bold">
                                  {user.username.slice(0, 2).toUpperCase()}
                                </div>
                                <span>{user.username}</span>
                              </div>
                            </td>
                            <td className="p-4">{user.email}</td>
                            <td className="p-4">{user.coinBalance.toLocaleString()}</td>
                            <td className="p-4">{user.pointBalance.toLocaleString()}</td>
                            <td className="p-4">Level {user.level}</td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" title="View Details" data-testid={`view-user-${user.id}`}>
                                  <Eye className="w-4 h-4 text-neon-cyan" />
                                </Button>
                                <Button variant="ghost" size="sm" title="Reset Balance" data-testid={`reset-user-${user.id}`}>
                                  <RotateCcw className="w-4 h-4 text-neon-pink" />
                                </Button>
                                <Button variant="ghost" size="sm" title="Suspend" data-testid={`suspend-user-${user.id}`}>
                                  <Ban className="w-4 h-4 text-red-400" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Promotions Section */}
        {currentSection === "promotions" && (
          <div className="p-6" data-testid="admin-promotions">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-arcade text-3xl font-bold glow-green">Promotion Management</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Promotion Form */}
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle>Create New Promotion</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePromotionSubmit} className="space-y-4" data-testid="create-promotion-form">
                    <div>
                      <Label htmlFor="promo-title">Promotion Title</Label>
                      <Input
                        id="promo-title"
                        value={promotionForm.title}
                        onChange={(e) => setPromotionForm({ ...promotionForm, title: e.target.value })}
                        placeholder="Enter promotion title"
                        required
                        data-testid="input-promo-title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="promo-description">Description</Label>
                      <Textarea
                        id="promo-description"
                        value={promotionForm.description}
                        onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })}
                        placeholder="Describe the promotion..."
                        required
                        data-testid="input-promo-description"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="promo-start">Start Date</Label>
                        <Input
                          id="promo-start"
                          type="datetime-local"
                          value={promotionForm.startDate}
                          onChange={(e) => setPromotionForm({ ...promotionForm, startDate: e.target.value })}
                          required
                          data-testid="input-promo-start"
                        />
                      </div>
                      <div>
                        <Label htmlFor="promo-end">End Date</Label>
                        <Input
                          id="promo-end"
                          type="datetime-local"
                          value={promotionForm.endDate}
                          onChange={(e) => setPromotionForm({ ...promotionForm, endDate: e.target.value })}
                          required
                          data-testid="input-promo-end"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="promo-type">Promotion Type</Label>
                        <Select
                          value={promotionForm.type}
                          onValueChange={(value) => setPromotionForm({ ...promotionForm, type: value })}
                        >
                          <SelectTrigger data-testid="select-promo-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bonus_points">Bonus Points</SelectItem>
                            <SelectItem value="extra_coins">Extra Coins</SelectItem>
                            <SelectItem value="discount">Discount</SelectItem>
                            <SelectItem value="free_credits">Free Credits</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="promo-value">Value</Label>
                        <Input
                          id="promo-value"
                          type="number"
                          value={promotionForm.value}
                          onChange={(e) => setPromotionForm({ ...promotionForm, value: e.target.value })}
                          placeholder="Amount"
                          required
                          data-testid="input-promo-value"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30"
                      disabled={createPromotionMutation.isPending}
                      data-testid="create-promotion-button"
                    >
                      {createPromotionMutation.isPending ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Create Promotion
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Active Promotions List */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Active Promotions</h3>

                {promotionsLoading ? (
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                ) : promotions.length > 0 ? (
                  promotions.map((promo) => (
                    <Card key={promo.id} className="promo-card" data-testid={`promotion-item-${promo.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">{promo.title}</h4>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" title="Edit" data-testid={`edit-promo-${promo.id}`}>
                              <Edit className="w-4 h-4 text-neon-cyan" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Delete" data-testid={`delete-promo-${promo.id}`}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{promo.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span>Expires: {new Date(promo.endDate).toLocaleDateString()}</span>
                          <Badge
                            className={promo.isActive ? "bg-neon-green/20 text-neon-green" : "bg-gray-500/20 text-gray-500"}
                          >
                            {promo.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground" data-testid="no-promotions">
                    <Gift className="w-12 h-12 mx-auto mb-4" />
                    <p>No promotions created yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rewards Section */}
        {currentSection === "rewards" && (
          <div className="p-6" data-testid="admin-rewards">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-arcade text-3xl font-bold glow-green">Reward Management</h2>
              <Button
                onClick={() => {/* TODO: Add reward creation modal */}}
                className="neon-border-cyan bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
                data-testid="create-reward-button"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Reward
              </Button>
            </div>

            {rewardsLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : rewards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((reward) => (
                  <Card key={reward.id} className="card-glow" data-testid={`reward-${reward.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2">{reward.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{reward.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Star className="w-4 h-4 text-neon-cyan" />
                              <span className="text-sm font-semibold text-neon-cyan">
                                {reward.pointsRequired} points
                              </span>
                            </div>
                            <Badge 
                              variant={reward.stock > 0 ? "default" : "secondary"}
                              className={reward.stock > 0 
                                ? "bg-neon-green/20 text-neon-green" 
                                : "bg-red-400/20 text-red-400"
                              }
                            >
                              {reward.stock} in stock
                            </Badge>
                          </div>
                        </div>
                        <span className="text-2xl ml-2">{reward.emoji}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={reward.isActive ? "default" : "secondary"}
                          className={reward.isActive 
                            ? "bg-neon-green/20 text-neon-green" 
                            : "bg-gray-400/20 text-gray-400"
                          }
                        >
                          {reward.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" title="Edit" data-testid={`edit-reward-${reward.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete" data-testid={`delete-reward-${reward.id}`}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12" data-testid="no-rewards">
                <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Rewards Created</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first reward to encourage users to earn more points!
                </p>
                <Button
                  onClick={() => {/* TODO: Add reward creation modal */}}
                  className="neon-border-cyan bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Reward
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Claim Rewards Section */}
        {currentSection === "claim-rewards" && (
          <div className="p-6" data-testid="admin-claim-rewards">
            <div className="mb-6">
              <h2 className="font-arcade text-3xl font-bold glow-green">Claim Rewards for Users</h2>
              <p className="text-muted-foreground mt-2">Process reward redemptions for customers at the cashier</p>
            </div>

            <Card className="card-glow mb-6">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Claim Reward</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!claimRewardForm.userId || !claimRewardForm.rewardId) {
                    toast({
                      title: "Validation Error",
                      description: "Please select both user and reward",
                      variant: "destructive",
                    });
                    return;
                  }
                  claimRewardMutation.mutate(claimRewardForm);
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="claim-user">Select User</Label>
                      <Select
                        value={claimRewardForm.userId}
                        onValueChange={(value) => setClaimRewardForm({ ...claimRewardForm, userId: value })}
                      >
                        <SelectTrigger data-testid="select-claim-user">
                          <SelectValue placeholder="Choose a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.username} ({user.email}) - {user.pointBalance} points
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="claim-reward">Select Reward</Label>
                      <Select
                        value={claimRewardForm.rewardId}
                        onValueChange={(value) => setClaimRewardForm({ ...claimRewardForm, rewardId: value })}
                      >
                        <SelectTrigger data-testid="select-claim-reward">
                          <SelectValue placeholder="Choose a reward..." />
                        </SelectTrigger>
                        <SelectContent>
                          {rewards.filter(r => r.isActive && r.stock > 0).map((reward) => (
                            <SelectItem key={reward.id} value={reward.id}>
                              {reward.title} - {reward.pointsRequired} points ({reward.stock} left)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={claimRewardMutation.isPending}
                    className="w-full bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30"
                    data-testid="claim-reward-button"
                  >
                    {claimRewardMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Claiming Reward...
                      </>
                    ) : (
                      "Claim Reward for User"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Available Rewards Preview */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-4">Available Rewards</h3>
              {rewardsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : rewards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.filter(r => r.isActive && r.stock > 0).map((reward) => (
                    <Card key={reward.id} className="card-glow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold">{reward.title}</h4>
                            <p className="text-sm text-muted-foreground">{reward.description}</p>
                          </div>
                          <span className="text-xl ml-2">{reward.emoji}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Star className="w-4 h-4 text-neon-cyan" />
                            <span className="text-sm font-semibold text-neon-cyan">
                              {reward.pointsRequired} points
                            </span>
                          </div>
                          <Badge className="bg-neon-green/20 text-neon-green">
                            {reward.stock} left
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No active rewards available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sales Section */}
        {currentSection === "sales" && (
          <div className="p-6" data-testid="admin-sales">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-arcade text-3xl font-bold glow-green">Sales Reports</h2>
              <div className="flex space-x-4">
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-40" data-testid="select-timeframe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  data-testid="export-button"
                  onClick={() => {
                    const rows = transactions as any[];
                    const headers = ["id","userId","type","amount","coinsAdded","pointsEarned","description","status","createdAt"];
                    const escape = (v: any) => {
                      if (v === null || v === undefined) return "";
                      const s = String(v).replace(/"/g, '""');
                      return `"${s}"`;
                    };
                    const csv = [
                      headers.join(","),
                      ...rows.map(r => headers.map(h => escape((r as any)[h])).join(","))
                    ].join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `transactions-${new Date().toISOString()}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {timeframe === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label>Start date</Label>
                  <Input
                    type="datetime-local"
                    value={salesFilters.startDate || ""}
                    onChange={(e) => setSalesFilters({ ...salesFilters, startDate: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <Label>End date</Label>
                  <Input
                    type="datetime-local"
                    value={salesFilters.endDate || ""}
                    onChange={(e) => setSalesFilters({ ...salesFilters, endDate: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={salesFilters.type || ""}
                    onValueChange={(v) => setSalesFilters({ ...salesFilters, type: v || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="reward_redemption">Reward Redemption</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={salesFilters.status || ""}
                    onValueChange={(v) => setSalesFilters({ ...salesFilters, status: v || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>User ID</Label>
                  <Input
                    placeholder="Filter by user ID"
                    value={salesFilters.userId || ""}
                    onChange={(e) => setSalesFilters({ ...salesFilters, userId: e.target.value || undefined })}
                  />
                </div>
              </div>
            )}

            {/* Sales Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="card-glow text-center">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Total Sales</h3>
                  <p className="text-3xl font-bold glow-cyan" data-testid="total-sales">
                    ₱{formatMoney(analytics?.totalRevenue)}
                  </p>
                  <p className="text-sm text-muted-foreground">All time</p>
                </CardContent>
              </Card>
              <Card className="card-glow text-center">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Transactions</h3>
                  <p className="text-3xl font-bold glow-cyan" data-testid="total-transactions-sales">
                    {analytics?.totalTransactions || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">All time</p>
                </CardContent>
              </Card>
              <Card className="card-glow text-center">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Avg. Transaction</h3>
                  <p className="text-3xl font-bold glow-cyan" data-testid="avg-transaction-sales">
                    ₱{formatMoney(analytics?.averageTransaction)}
                  </p>
                  <p className="text-sm text-muted-foreground">Per transaction</p>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Table */}
            {transactionsLoading ? (
              <div className="flex justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <Card className="card-glow">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="text-left p-4">Date</th>
                          <th className="text-left p-4">User</th>
                          <th className="text-left p-4">Type</th>
                          <th className="text-left p-4">Amount</th>
                          <th className="text-left p-4">Points Awarded</th>
                          <th className="text-left p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} data-testid={`sales-transaction-${transaction.id}`}>
                            <td className="p-4">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4">{transaction.userId}</td>
                            <td className="p-4">{transaction.description}</td>
                            <td className="p-4 font-semibold">
                              {transaction.amount ? `₱${transaction.amount}` : `${transaction.coinsAdded} coins`}
                            </td>
                            <td className="p-4 text-neon-cyan">+{transaction.pointsEarned}</td>
                            <td className="p-4">
                              <Badge
                                variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                                className={transaction.status === 'completed'
                                  ? 'bg-neon-green/20 text-neon-green'
                                  : 'bg-yellow-400/20 text-yellow-400'
                                }
                              >
                                {transaction.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Top-Up Section */}
        {currentSection === "topup" && (
          <div className="p-6" data-testid="admin-topup">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-arcade text-3xl font-bold glow-green">User Top-Up</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top-Up Form */}
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle>Record Cashier Purchase / Top-Up</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTopupSubmit} className="space-y-4" data-testid="topup-form">
                    <div>
                      <Label htmlFor="topup-user">Select User</Label>
                      <Select
                        value={topupForm.userId}
                        onValueChange={(value) => setTopupForm({ ...topupForm, userId: value })}
                      >
                        <SelectTrigger data-testid="select-topup-user">
                          <SelectValue placeholder="Choose a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.username} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="topup-amount">Amount Paid (₱)</Label>
                        <Input
                          id="topup-amount"
                          type="number"
                          step="0.01"
                          value={topupForm.amount}
                          onChange={(e) => setTopupForm({ ...topupForm, amount: e.target.value })}
                          placeholder="0.00"
                          data-testid="input-topup-amount"
                        />
                      </div>
                      <div>
                        <Label htmlFor="topup-coins">Coins to Add</Label>
                        <Input
                          id="topup-coins"
                          type="number"
                          value={topupForm.coins}
                          onChange={(e) => setTopupForm({ ...topupForm, coins: e.target.value })}
                          placeholder="0"
                          data-testid="input-topup-coins"
                        />
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Points to award: <span className="font-semibold text-neon-cyan">{isNaN(computedPoints) ? 0 : computedPoints}</span> (₱50 = 1 point)
                    </div>

                    <div>
                      <Label htmlFor="topup-reason">Reason (Optional)</Label>
                      <Textarea
                        id="topup-reason"
                        value={topupForm.reason}
                        onChange={(e) => setTopupForm({ ...topupForm, reason: e.target.value })}
                        placeholder="Reason for top-up..."
                        data-testid="input-topup-reason"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full py-3 bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30"
                      disabled={topupMutation.isPending}
                      data-testid="process-topup-button"
                    >
                      {topupMutation.isPending ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <UserCog className="w-4 h-4 mr-2" />
                      )}
                      Process Top-Up
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Recent Top-Ups */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Recent Top-Up History</h3>

                <Card className="card-glow">
                  <CardContent className="p-0">
                    <div className="text-center py-8 text-muted-foreground" data-testid="topup-history-placeholder">
                      <UserCog className="w-12 h-12 mx-auto mb-4" />
                      <p>Top-up history will appear here</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
