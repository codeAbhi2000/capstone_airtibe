import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-brand-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:bg-brand-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] active:bg-brand-700",
          variant === "secondary" &&
            "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground",
          variant === "ghost" && "text-muted-foreground hover:bg-secondary hover:text-foreground",
          size === "sm" && "h-9 px-3.5 text-sm",
          size === "md" && "h-11 px-5 text-sm",
          size === "lg" && "h-12 px-6 text-base",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
