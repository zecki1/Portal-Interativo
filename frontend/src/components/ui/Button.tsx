import { cn } from "../../lib/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "red" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  block?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  block = false,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    primary: "bg-brand-black text-white ring-1 ring-inset ring-white/10 hover:opacity-90 shadow-sm",
    red: "bg-brand-red text-white hover:bg-brand-red-dark shadow-sm",
    danger: "bg-brand-red-dark text-white hover:opacity-90 shadow-sm",
    secondary: "border border-line bg-surface text-ink hover:border-brand-red hover:text-brand-red-ink",
    ghost: "bg-transparent text-ink hover:bg-surface-3",
    light: "bg-[#f4f4f5] text-[#0c0c0d] shadow-sm hover:bg-white",
  } as const;

  const sizes = {
    sm: "h-9 px-4 text-sm rounded-full",
    md: "h-11 px-6 text-sm rounded-full",
    lg: "h-12 px-7 text-base rounded-full",
    icon: "h-10 w-10 rounded-full",
  } as const;

  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      {...props}
    >
      {children}
    </button>
  );
}
