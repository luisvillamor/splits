import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "white" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-splits-red text-white hover:bg-splits-red-dark disabled:bg-splits-red/50",
  secondary:
    "bg-splits-soft text-splits-red hover:bg-[#ffd9de] disabled:opacity-50",
  ghost: "bg-transparent text-splits-ink hover:bg-black/5 disabled:opacity-50",
  white: "bg-white text-splits-red hover:bg-splits-soft disabled:opacity-60",
  danger: "bg-[#fff1f1] text-[#b42318] hover:bg-[#ffe4e4]",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex h-[48px] min-h-12 w-full items-center justify-center rounded-full px-5 text-[16px] font-medium transition active:scale-[0.99] disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
