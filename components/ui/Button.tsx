import Link from "next/link";

type Variant = "primary" | "accent" | "outline" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-jungle-800 text-sand-50 hover:bg-jungle-700",
  accent: "bg-lime-500 text-jungle-900 hover:bg-lime-400",
  outline:
    "border-2 border-jungle-800 text-jungle-800 hover:bg-jungle-800 hover:text-sand-50",
  ghost: "text-jungle-800 hover:bg-jungle-800/10",
};

/* Both sizes clear the 44px touch target. */
const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 text-[0.95rem]",
  lg: "min-h-14 px-7 text-lg",
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
