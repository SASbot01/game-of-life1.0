import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-neon-cyan",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-neon-red",
        outline: "border border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        cyber: "relative overflow-hidden font-semibold bg-gradient-to-r from-primary to-mana text-primary-foreground hover:shadow-neon-cyan hover:-translate-y-0.5",
        "cyber-gold": "bg-gradient-to-r from-accent to-stamina text-accent-foreground hover:shadow-neon-gold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  noSound?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, noSound = false, onClick, onMouseEnter, ...props }, ref) => {
    const { playSound } = useSoundEffects();
    const Comp = asChild ? Slot : "button";
    
    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (!noSound) {
        playSound('click');
      }
      onClick?.(e);
    }, [noSound, playSound, onClick]);

    const handleMouseEnter = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (!noSound) {
        playSound('hover');
      }
      onMouseEnter?.(e);
    }, [noSound, playSound, onMouseEnter]);

    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        {...props} 
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
