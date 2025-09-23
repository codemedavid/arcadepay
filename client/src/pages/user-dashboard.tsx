import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { NeonButton } from "@/components/neon-button";
import { useLocation } from "wouter";
import { 
  ShoppingCart, 
  Gift, 
  History, 
  Trophy, 
  Coins, 
  Star,
  CreditCard
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

const coinPackages = [
  { id: "starter", name: "Starter Pack", coins: 500, points: 50, price: 5.00, emoji: "🎮", description: "Perfect for new players" },
  { id: "gamer", name: "Gamer Pack", coins: 1200, points: 150, price: 10.00, emoji: "🚀", description: "Best value for money", popular: true },
  { id: "pro", name: "Pro Pack", coins: 2500, points: 400, price: 20.00, emoji: "⭐", description: "For serious gamers" },
  { id: "elite", name: "Elite Pack", coins: 5500, points: 1000, price: 40.00, emoji: "👑", description: "Ultimate gaming experience" },
];

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState(coinPackages[1]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/user/transactions"],
  });

  const { data: promotions = [], isLoading: promotionsLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/promotions"],
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

  const handlePurchase = () => {
    setLocation(`/checkout?package=${selectedPackage.id}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-8" data-testid="user-dashboard">
      <Tabs defaultValue="buy-coins" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card">
          <TabsTrigger value="buy-coins" className="data-[state=active]:neon-border-cyan" data-testid="tab-buy-coins">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Buy Coins
          </TabsTrigger>
          <TabsTrigger value="promotions" className="data-[state=active]:neon-border-cyan" data-testid="tab-promotions">
            <Gift className="mr-2 h-4 w-4" />
            Promotions
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

        {/* Buy Coins Tab */}
        <TabsContent value="buy-coins" className="space-y-6" data-testid="content-buy-coins">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coin Packages */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-arcade text-2xl mb-6 glow-green">Choose Your Package</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coinPackages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`cursor-pointer transition-all card-glow ${
                      selectedPackage.id === pkg.id 
                        ? "neon-border-cyan scale-105" 
                        : "hover:border-neon-cyan/50"
                    } ${pkg.popular ? "relative" : ""}`}
                    onClick={() => setSelectedPackage(pkg)}
                    data-testid={`package-${pkg.id}`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-neon-pink">POPULAR</Badge>
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-lg">{pkg.name}</h4>
                          <p className="text-muted-foreground text-sm">{pkg.description}</p>
                        </div>
                        <div className="text-3xl">{pkg.emoji}</div>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Coins className="w-4 h-4 text-yellow-400" />
                          <span className="text-xl font-bold">{pkg.coins.toLocaleString()} Coins</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-neon-cyan" />
                          <span className="text-neon-cyan">+{pkg.points} Bonus Points</span>
                        </div>
                      </div>
                      <div className="text-xl font-semibold text-neon-pink">
                        ${pkg.price.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Payment Panel */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span>{selectedPackage.name}</span>
                    <span className="font-semibold">${selectedPackage.price.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedPackage.coins.toLocaleString()} Coins + {selectedPackage.points} Points
                  </div>
                </div>
                
                <NeonButton
                  variant="cyan"
                  className="w-full py-3"
                  onClick={handlePurchase}
                  data-testid="purchase-button"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Purchase with Stripe
                </NeonButton>
                
                <div className="text-xs text-muted-foreground text-center">
                  Secure payment processing by Stripe
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="space-y-6" data-testid="content-promotions">
          <h3 className="font-arcade text-2xl mb-6 glow-green">Active Promotions</h3>
          
          {promotionsLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          ) : promotions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promotions.map((promo) => (
                <Card key={promo.id} className="promo-card" data-testid={`promotion-${promo.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-lg">{promo.title}</h4>
                        <p className="text-sm text-muted-foreground">{promo.description}</p>
                      </div>
                      <span className="text-2xl">{promo.emoji}</span>
                    </div>
                    <div className="mb-4">
                      <div className="text-sm text-muted-foreground">
                        Expires: {new Date(promo.endDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-bold text-neon-green">
                        +{promo.value} {promo.type.includes('points') ? 'Points' : 'Coins'}
                      </div>
                    </div>
                    <Button
                      onClick={() => redeemMutation.mutate(promo.id)}
                      disabled={redeemMutation.isPending}
                      className="w-full bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30"
                      data-testid={`redeem-${promo.id}`}
                    >
                      {redeemMutation.isPending ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : null}
                      Claim Promotion
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12" data-testid="no-promotions">
              <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Active Promotions</h3>
              <p className="text-muted-foreground">Check back later for exciting offers!</p>
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
                                <ShoppingCart className="w-4 h-4 text-neon-cyan mr-2" />
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
