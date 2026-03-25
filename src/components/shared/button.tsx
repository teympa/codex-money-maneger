import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    fullWidth?: boolean;
    isLoading?: boolean;
    loadingText?: string;
  }
>;

export function Button({
  children,
  className,
  variant = "primary",
  fullWidth,
  isLoading = false,
  loadingText,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      aria-busy={isLoading}
      className={cn(
        "theme-button inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium transition",
        variant === "primary" && "theme-button--primary",
        variant === "secondary" && "theme-button--secondary",
        variant === "ghost" && "theme-button--ghost",
        variant === "danger" && "theme-button--danger",
        fullWidth && "w-full",
        variant === "primary" &&
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]",
        variant === "secondary" &&
          "bg-[var(--button-secondary-background)] text-[var(--button-secondary-text)] hover:bg-[var(--button-secondary-hover)]",
        variant === "ghost" &&
          "bg-transparent text-[var(--button-ghost-text)] hover:bg-[var(--button-ghost-hover)]",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      <span className="inline-flex items-center gap-2">
        {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        <span>{isLoading && loadingText ? loadingText : children}</span>
      </span>
    </button>
  );
}
