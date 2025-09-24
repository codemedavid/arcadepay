import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useLocation } from "wouter";
import { 
  Gift, 
  History, 
  Trophy, 
  Coins, 
  Star,
  Award
} from "lucide-react";

interface Transaction {
  id: string;
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
  emoji: string;
  endDate: string;
}

interface User {
  id: string;
  username: string;
  coinBalance: number;
  pointBalance: number;
  level: number;
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


export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
    staleTime: 0, // Always refetch auth state
    refetchOnWindowFocus: true,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/user/transactions"],
  });

  const { data: promotions = [], isLoading: promotionsLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/promotions"],
  });

  const { data: rewards = [], isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
  });

  const { data: userBalance } = useQuery({
    queryKey: ["/api/user/balance"],
    refetchInterval: 5000, // Refresh balance every 5 seconds
  });

  const redeemMutation = useMutation({
    mutationFn: async (promotionId: string) => {
      return await apiRequest("POST", `/api/promotions/redeem/${promotionId}`, {});
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Promotion Redeemed!",
        description: `You earned ${data.pointsEarned} points${data.coinsEarned > 0 ? ` and ${data.coinsEarned} coins` : ""}`,
      });
      
      // Refresh relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: async (error: any) => {
      const errorData = await error.response?.json?.() || { message: "Failed to redeem promotion" };
      toast({
        title: "Error",
        description: errorData.message,
        variant: "destructive",
      });
    },
  });

  const redeemRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return await apiRequest("POST", `/api/rewards/redeem/${rewardId}`, {});
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Reward Redeemed!",
        description: `You successfully redeemed your reward! Redemption code: ${data.redemptionCode}`,
      });
      
      // Refresh relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
    },
    onError: async (error: any) => {
      const errorData = await error.response?.json?.() || { message: "Failed to redeem reward" };
      toast({
        title: "Error",
        description: errorData.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-8" data-testid="user-dashboard">
      {/* Points Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="card-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Your Points</h3>
                <div className="flex items-center space-x-2">
                  <Star className="w-6 h-6 text-neon-cyan" />
                  <span className="text-3xl font-bold text-neon-cyan">
                    {(userBalance as any)?.pointBalance?.toLocaleString() || user?.user?.pointBalance?.toLocaleString() || 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Earn more points by playing games and claiming promotions!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Your Coins</h3>
                <div className="flex items-center space-x-2">
                  <Coins className="w-6 h-6 text-yellow-400" />
                  <span className="text-3xl font-bold text-yellow-400">
                    {(userBalance as any)?.coinBalance?.toLocaleString() || user?.user?.coinBalance?.toLocaleString() || 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Use coins to play arcade games and unlock rewards!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="promotions" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card">
          <TabsTrigger value="promotions" className="data-[state=active]:neon-border-cyan" data-testid="tab-promotions">
            <Gift className="mr-2 h-4 w-4" />
            Rewards
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:neon-border-cyan" data-testid="tab-history">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:neon-border-cyan" data-testid="tab-leaderboard">
            <Trophy className="mr-2 h-4 w-4" />
            Leaderboard
          </TabsTrigger>
        </TabsList>


        {/* Rewards Tab */}
        <TabsContent value="promotions" className="space-y-6" data-testid="content-promotions">
          <h3 className="font-arcade text-2xl mb-6 glow-green">Available Rewards</h3>
          
          {rewardsLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          ) : rewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => (
                <Card key={reward.id} className="promo-card" data-testid={`reward-${reward.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{reward.title}</h4>
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
                            {reward.stock} left
                          </Badge>
                        </div>
                      </div>
                      <span className="text-2xl ml-2">{reward.emoji}</span>
                    </div>
                    
                    <Button
                      onClick={() => redeemRewardMutation.mutate(reward.id)}
                      disabled={redeemRewardMutation.isPending || reward.stock <= 0 || (userBalance?.pointBalance || 0) < reward.pointsRequired}
                      className="w-full bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30 disabled:opacity-50"
                      data-testid={`redeem-reward-${reward.id}`}
                    >
                      {redeemRewardMutation.isPending ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : reward.stock <= 0 ? (
                        "Out of Stock"
                      ) : (userBalance?.pointBalance || 0) < reward.pointsRequired ? (
                        "Insufficient Points"
                      ) : (
                        "Redeem Reward"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12" data-testid="no-rewards">
              <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Rewards Available</h3>
              <p className="text-muted-foreground">Check back later for exciting rewards!</p>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6" data-testid="content-history">
          <h3 className="font-arcade text-2xl mb-6 glow-green">Transaction History</h3>
          
          {transactionsLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          ) : transactions.length > 0 ? (
            <Card className="card-glow">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/20">
                      <tr>
                        <th className="text-left p-4">Date</th>
                        <th className="text-left p-4">Type</th>
                        <th className="text-left p-4">Amount</th>
                        <th className="text-left p-4">Points Earned</th>
                        <th className="text-left p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} data-testid={`transaction-${transaction.id}`}>
                          <td className="p-4">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center">
                              {transaction.type === 'purchase' && (
                                <Coins className="w-4 h-4 text-neon-cyan mr-2" />
                              )}
                              {transaction.type === 'promotion' && (
                                <Gift className="w-4 h-4 text-neon-pink mr-2" />
                              )}
                              {transaction.type === 'admin_topup' && (
                                <Star className="w-4 h-4 text-yellow-400 mr-2" />
                              )}
                              {transaction.description}
                            </div>
                          </td>
                          <td className="p-4">
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
          ) : (
            <div className="text-center py-12" data-testid="no-transactions">
              <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Transaction History</h3>
              <p className="text-muted-foreground">Start playing to see your transaction history!</p>
            </div>
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6" data-testid="content-leaderboard">
          <h3 className="font-arcade text-2xl mb-6 glow-green">Top Players</h3>
          
          <div className="space-y-4">
            <div className="text-center py-12" data-testid="leaderboard-placeholder">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Leaderboard Coming Soon</h3>
              <p className="text-muted-foreground">
                Rankings will be available once more players join the platform!
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
