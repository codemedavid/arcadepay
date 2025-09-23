import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface NeonButtonProps {
  children: ReactNode;
  variant?: "cyan" | "pink" | "green" | "purple";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  "data-testid"?: string;
}

export function NeonButton({ 
  children, 
  variant = "cyan", 
  className, 
  onClick, 
  disabled, 
  type = "button",
  "data-testid": testId
}: NeonButtonProps) {
  const variantClasses = {
    cyan: "neon-border-cyan text-neon-cyan hover:bg-neon-cyan/10",
    pink: "neon-border-pink text-neon-pink hover:bg-neon-pink/10",
    green: "neon-border-green text-neon-green hover:bg-neon-green/10",
    purple: "neon-border-purple text-neon-purple hover:bg-neon-purple/10",
  };

  return (
    <Button
      variant="outline"
      className={cn(
        "btn-glow transition-all duration-300 font-semibold",
        variantClasses[variant],
        className
      )}
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-testid={testId}
    >
      {children}
    </Button>
  );
}
