import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Coins, Star } from "lucide-react";

const coinPackages = {
  starter: { name: "Starter Pack", coins: 500, points: 50, price: 5.00 },
  gamer: { name: "Gamer Pack", coins: 1200, points: 150, price: 10.00 },
  pro: { name: "Pro Pack", coins: 2500, points: 400, price: 20.00 },
  elite: { name: "Elite Pack", coins: 5500, points: 1000, price: 40.00 },
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [packageType, setPackageType] = useState("gamer");

  // Get package type from URL params
  useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pkg = urlParams.get('package') || 'gamer';
    setPackageType(pkg);
  });

  const packageInfo = coinPackages[packageType as keyof typeof coinPackages];

  const handlePurchase = () => {
    toast({
      title: "Payment System Disabled",
      description: "Payment processing has been temporarily disabled. Please contact an administrator for coin purchases.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background py-8" data-testid="checkout-page">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="text-muted-foreground hover:text-foreground"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="font-arcade glow-green">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{packageInfo?.name}</span>
                  <span className="text-xl font-bold">₱{packageInfo?.price?.toFixed(2)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  • {packageInfo?.coins?.toLocaleString()} Arcade Coins
                </div>
                <div className="text-sm text-neon-cyan">
                  • +{packageInfo?.points} Bonus Points
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Notice */}
          <Card className="card-glow border-yellow-400/50">
            <CardHeader>
              <CardTitle className="text-yellow-400">Payment System Notice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Payment processing has been temporarily disabled. To purchase coins, please contact an administrator.
                </p>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span>Coins: {packageInfo?.coins?.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-neon-cyan">
                  <Star className="w-4 h-4" />
                  <span>Bonus Points: +{packageInfo?.points}</span>
                </div>
                <Button
                  onClick={handlePurchase}
                  className="w-full py-3 bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30"
                  data-testid="contact-admin-button"
                >
                  Contact Administrator
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}