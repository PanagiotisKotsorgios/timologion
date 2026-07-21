import Link from "next/link";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type ComponentType,
  type SVGProps,
} from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/**
 * Lucide icons expose a common React component signature. Using this loose type
 * keeps consumers free to pass any lucide-react icon without importing extra
 * types.
 */
export type IconType = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string }
>;

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary:
    "bg-white text-ink-900 border-2 border-ink-300 hover:border-ink-500 hover:bg-ink-100",
  ghost: "text-ink-900 hover:bg-ink-100",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-5 text-base",
  lg: "h-14 px-6 text-lg",
};

const iconSize: Record<Size, number> = { sm: 16, md: 18, lg: 20 };

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  icon?: IconType;
  iconRight?: IconType;
};

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    className,
    children,
    icon: Icon,
    iconRight: IconRight,
    ...rest
  },
  ref,
) {
  const sz = iconSize[size];
  return (
    <button
      ref={ref}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {Icon && <Icon size={sz} aria-hidden />}
      {children}
      {IconRight && <IconRight size={sz} aria-hidden />}
    </button>
  );
});

type LinkButtonProps = CommonProps & {
  href: string;
};

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  icon: Icon,
  iconRight: IconRight,
}: LinkButtonProps) {
  const sz = iconSize[size];
  return (
    <Link
      href={href}
      className={clsx(base, variants[variant], sizes[size], className)}
    >
      {Icon && <Icon size={sz} aria-hidden />}
      {children}
      {IconRight && <IconRight size={sz} aria-hidden />}
    </Link>
  );
}
