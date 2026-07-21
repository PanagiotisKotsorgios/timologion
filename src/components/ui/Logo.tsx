import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

type Size = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

const dims: Record<Size, { w: number; h: number; className: string }> = {
  sm: { w: 200, h: 68, className: "h-12 w-auto" },
  md: { w: 280, h: 95, className: "h-16 w-auto" },
  lg: { w: 360, h: 122, className: "h-20 w-auto" },
  xl: { w: 480, h: 163, className: "h-28 w-auto" },
  "2xl": { w: 640, h: 217, className: "h-40 w-auto" },
  "3xl": { w: 800, h: 272, className: "h-52 w-auto" },
};

export function Logo({
  size = "md",
  linkTo,
  className,
  priority,
}: {
  size?: Size;
  linkTo?: string;
  className?: string;
  priority?: boolean;
}) {
  const d = dims[size];
  const img = (
    <Image
      src="/logo.png"
      alt="timologion"
      width={d.w}
      height={d.h}
      priority={priority}
      className={clsx(d.className, className)}
    />
  );
  return linkTo ? (
    <Link href={linkTo} aria-label="timologion αρχική" className="inline-flex">
      {img}
    </Link>
  ) : (
    img
  );
}
