import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ packageInfo }: { packageInfo: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      // Confirm payment on our backend
      try {
        await apiRequest("POST", "/api/payment/confirm", {
          paymentIntentId: paymentIntent.id,
        });

        toast({
          title: "Payment Successful",
          description: `You've received ${packageInfo.coins} coins and ${packageInfo.points} points!`,
        });

        setLocation("/dashboard");
      } catch (error) {
        toast({
          title: "Payment Processing Error",
          description: "Payment succeeded but there was an error updating your account. Please contact support.",
          variant: "destructive",
        });
      }
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-3 neon-border-cyan bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
        data-testid="submit-payment"
      >
        {isProcessing ? (
          <LoadingSpinner size="sm" className="mr-2" />
        ) : null}
        Pay ${packageInfo?.price?.toFixed(2)}
      </Button>
    </form>
  );
};

const coinPackages = {
  starter: { name: "Starter Pack", coins: 500, points: 50, price: 5.00 },
  gamer: { name: "Gamer Pack", coins: 1200, points: 150, price: 10.00 },
  pro: { name: "Pro Pack", coins: 2500, points: 400, price: 20.00 },
  elite: { name: "Elite Pack", coins: 5500, points: 1000, price: 40.00 },
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [packageType, setPackageType] = useState("");

  useEffect(() => {
    // Get package type from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const pkg = urlParams.get('package') || 'gamer';
    setPackageType(pkg);

    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-payment-intent", { packageType: pkg })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error("Error creating payment intent:", error);
        setLocation("/dashboard");
      });
  }, [setLocation]);

  const packageInfo = coinPackages[packageType as keyof typeof coinPackages];

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="checkout-loading">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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
                  <span className="text-xl font-bold">${packageInfo?.price?.toFixed(2)}</span>
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

          {/* Payment Form */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm packageInfo={packageInfo} />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
