import { useState } from "react";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  Users, 
  DollarSign, 
  Gift, 
  Clock, 
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Star,
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

export default function AdminDashboard() {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine current section from URL
  const getCurrentSection = () => {
    if (location === "/admin") return "overview";
    if (location.includes("/users")) return "users";
    if (location.includes("/promotions")) return "promotions";
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
    enabled: currentSection === "users",
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: currentSection === "sales",
  });

  const { data: promotions = [], isLoading: promotionsLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/admin/promotions"],
    enabled: currentSection === "promotions",
  });

  // Top-up form state
  const [topupForm, setTopupForm] = useState({
    userId: "",
    coins: "",
    points: "",
    reason: "",
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
      setTopupForm({ userId: "", coins: "", points: "", reason: "" });
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

  const handleTopupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupForm.userId || (!topupForm.coins && !topupForm.points)) {
      toast({
        title: "Validation Error",
        description: "Please select a user and specify coins or points to add",
        variant: "destructive",
      });
      return;
    }
    topupMutation.mutate(topupForm);
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
                          ${analytics?.totalRevenue?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-neon-pink/20 rounded-lg flex items-center justify-center">
                        <DollarSign className="text-neon-pink text-xl" />
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
                          ${analytics?.averageTransaction?.toFixed(2) || "0.00"}
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

        {/* Sales Section */}
        {currentSection === "sales" && (
          <div className="p-6" data-testid="admin-sales">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-arcade text-3xl font-bold glow-green">Sales Reports</h2>
              <div className="flex space-x-4">
                <Select defaultValue="7days">
                  <SelectTrigger className="w-40" data-testid="select-timeframe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="3months">Last 3 months</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" data-testid="export-button">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Sales Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="card-glow text-center">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Total Sales</h3>
                  <p className="text-3xl font-bold glow-cyan" data-testid="total-sales">
                    ${analytics?.totalRevenue?.toFixed(2) || "0.00"}
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
                    ${analytics?.averageTransaction?.toFixed(2) || "0.00"}
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
                              {transaction.amount ? `$${transaction.amount}` : `${transaction.coinsAdded} coins`}
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
                  <CardTitle>Add Coins/Points to User Account</CardTitle>
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
                      <div>
                        <Label htmlFor="topup-points">Bonus Points</Label>
                        <Input
                          id="topup-points"
                          type="number"
                          value={topupForm.points}
                          onChange={(e) => setTopupForm({ ...topupForm, points: e.target.value })}
                          placeholder="0"
                          data-testid="input-topup-points"
                        />
                      </div>
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
