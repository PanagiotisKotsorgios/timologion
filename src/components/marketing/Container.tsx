import type { ReactNode } from "react";
import clsx from "clsx";

export function Container({
  children,
  className,
  size = "wide",
}: {
  children: ReactNode;
  className?: string;
  size?: "narrow" | "wide" | "reading";
}) {
  const sizes = {
    narrow: "max-w-4xl",
    wide: "max-w-[1240px]",
    reading: "max-w-3xl",
  } as const;

  return (
    <div className={clsx("mx-auto w-full px-6 md:px-10", sizes[size], className)}>
      {children}
    </div>
  );
}
