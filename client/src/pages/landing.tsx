import { Link } from "wouter";
import { NeonButton } from "@/components/neon-button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: string;
  value: number;
  emoji: string;
  endDate: string;
}

export default function Landing() {
  const { data: promotions = [] } = useQuery<Promotion[]>({
    queryKey: ["/api/promotions"],
    retry: false,
  });

  return (
    <div className="min-h-screen" data-testid="landing-page">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--neon-cyan)) 0%, transparent 25%), radial-gradient(circle at 75% 75%, hsl(var(--neon-pink)) 0%, transparent 25%)`
            }}
          />
        </div>

        <div className="relative container mx-auto px-4 py-20 text-center">
          <h1 className="font-arcade text-6xl md:text-8xl font-black mb-6" data-testid="hero-title">
            <span className="glow-cyan">ARCADE</span>
            <span className="glow-pink">PAY</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-muted-foreground" data-testid="hero-subtitle">
            Earn points with every coin you play
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/auth">
              <NeonButton variant="cyan" className="px-8 py-4" data-testid="sign-up-button">
                <i className="fas fa-user-plus mr-2"></i>
                Sign Up
              </NeonButton>
            </Link>
            <Link href="/auth">
              <NeonButton variant="purple" className="px-8 py-4" data-testid="log-in-button">
                <i className="fas fa-sign-in-alt mr-2"></i>
                Log In
              </NeonButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Promotions Carousel */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <h2 className="font-arcade text-3xl md:text-4xl font-bold text-center mb-12 glow-pink" data-testid="promotions-title">
            Active Promotions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="promotions-grid">
            {promotions.length > 0 ? (
              promotions.map((promo) => (
                <Card key={promo.id} className="promo-card" data-testid={`promo-card-${promo.id}`}>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">{promo.emoji}</div>
                    <h3 className="font-arcade text-xl mb-2 glow-green">{promo.title}</h3>
                    <p className="text-muted-foreground mb-4">{promo.description}</p>
                    <Badge variant="secondary" className="bg-neon-green text-background">
                      {promo.type.toUpperCase()}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Default promotions when none are loaded
              <>
                <Card className="promo-card" data-testid="default-promo-1">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="font-arcade text-xl mb-2 glow-green">First Time Bonus</h3>
                    <p className="text-muted-foreground mb-4">Get 50% extra coins on your first purchase</p>
                    <Badge variant="secondary" className="bg-accent">
                      NEW USERS
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="promo-card" data-testid="default-promo-2">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="font-arcade text-xl mb-2 glow-green">Weekend Rush</h3>
                    <p className="text-muted-foreground mb-4">Double points on weekend purchases</p>
                    <Badge variant="secondary" className="bg-neon-green text-background">
                      2X POINTS
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="promo-card" data-testid="default-promo-3">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="font-arcade text-xl mb-2 glow-green">Loyalty Rewards</h3>
                    <p className="text-muted-foreground mb-4">Unlock exclusive bonuses as you play</p>
                    <Badge variant="secondary" className="bg-neon-purple">
                      VIP ONLY
                    </Badge>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8" data-testid="features-grid">
            <div className="text-center" data-testid="feature-1">
              <div className="w-16 h-16 mx-auto mb-4 bg-neon-cyan/20 rounded-full flex items-center justify-center">
                <i className="fas fa-coins text-2xl text-neon-cyan"></i>
              </div>
              <h3 className="font-semibold mb-2">Easy Coin Purchase</h3>
              <p className="text-muted-foreground text-sm">Buy coins instantly with secure payment</p>
            </div>

            <div className="text-center" data-testid="feature-2">
              <div className="w-16 h-16 mx-auto mb-4 bg-neon-pink/20 rounded-full flex items-center justify-center">
                <i className="fas fa-star text-2xl text-neon-pink"></i>
              </div>
              <h3 className="font-semibold mb-2">Earn Points</h3>
              <p className="text-muted-foreground text-sm">Get rewards with every purchase</p>
            </div>

            <div className="text-center" data-testid="feature-3">
              <div className="w-16 h-16 mx-auto mb-4 bg-neon-green/20 rounded-full flex items-center justify-center">
                <i className="fas fa-trophy text-2xl text-neon-green"></i>
              </div>
              <h3 className="font-semibold mb-2">Leaderboards</h3>
              <p className="text-muted-foreground text-sm">Compete with other players</p>
            </div>

            <div className="text-center" data-testid="feature-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-neon-purple/20 rounded-full flex items-center justify-center">
                <i className="fas fa-mobile-alt text-2xl text-neon-purple"></i>
              </div>
              <h3 className="font-semibold mb-2">Mobile Ready</h3>
              <p className="text-muted-foreground text-sm">Play anywhere, anytime</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
