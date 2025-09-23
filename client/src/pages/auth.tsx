import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthForm = z.infer<typeof authSchema>;

export default function Auth() {
  const [, setLocation] = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
  });

  const authMutation = useMutation({
    mutationFn: async (data: AuthForm) => {
      const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
      return await apiRequest("POST", endpoint, data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Success!",
        description: isSignUp ? "Account created successfully" : "Logged in successfully",
      });
      
      // Invalidate auth query to refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Redirect based on user role
      if (data.user.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/dashboard");
      }
    },
    onError: async (error: any) => {
      const errorData = await error.response?.json?.() || { message: "Authentication failed" };
      toast({
        title: "Error",
        description: errorData.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AuthForm) => {
    if (isSignUp && !data.username) {
      form.setError("username", { message: "Username is required for sign up" });
      return;
    }
    authMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="auth-page">
      <div className="w-full max-w-md">
        <Card className="card-glow">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="font-arcade text-3xl font-bold mb-2 glow-cyan" data-testid="auth-title">
                ARCADE PAY
              </h1>
              <p className="text-muted-foreground">Enter the neon arcade</p>
            </div>

            {/* Auth Toggle */}
            <div className="flex mb-6">
              <Button
                variant="ghost"
                className={`flex-1 py-2 ${!isSignUp ? "text-neon-cyan border-b-2 border-neon-cyan" : "text-muted-foreground border-b-2 border-transparent"}`}
                onClick={() => setIsSignUp(false)}
                data-testid="signin-tab"
              >
                Sign In
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 py-2 ${isSignUp ? "text-neon-cyan border-b-2 border-neon-cyan" : "text-muted-foreground border-b-2 border-transparent"}`}
                onClick={() => setIsSignUp(true)}
                data-testid="signup-tab"
              >
                Sign Up
              </Button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...form.register("email")}
                  className="w-full"
                  data-testid="input-email"
                />
                {form.formState.errors.email && (
                  <p className="text-red-400 text-sm mt-1" data-testid="error-email">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {isSignUp && (
                <div>
                  <Label htmlFor="username" className="block text-sm font-medium mb-2">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    {...form.register("username")}
                    className="w-full"
                    data-testid="input-username"
                  />
                  {form.formState.errors.username && (
                    <p className="text-red-400 text-sm mt-1" data-testid="error-username">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...form.register("password")}
                  className="w-full"
                  data-testid="input-password"
                />
                {form.formState.errors.password && (
                  <p className="text-red-400 text-sm mt-1" data-testid="error-password">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full py-3 neon-border-cyan bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 font-semibold"
                disabled={authMutation.isPending}
                data-testid="submit-button"
              >
                {authMutation.isPending ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <i className="fas fa-sign-in-alt mr-2"></i>
                )}
                {isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            {!isSignUp && (
              <div className="mt-6 text-center">
                <a href="#" className="text-sm text-neon-cyan hover:underline">
                  Forgot password?
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
