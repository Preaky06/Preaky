import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Magnetic } from "./Magnetic";

type Variant = "primary" | "ghost" | "tier";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-bg hover:bg-white",
  ghost: "glass text-ink hover:border-line-strong",
  tier: "bg-(--tier) text-bg hover:brightness-110",
};

export const buttonClass = (variant: Variant = "primary", className?: string) =>
  cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium",
    "transition-[background-color,border-color,filter] duration-200 select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-4",
    VARIANTS[variant],
    className,
  );

/** Lien-bouton principal, avec effet magnétique sur desktop. */
export function ButtonLink({
  variant = "primary",
  magnetic = true,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; magnetic?: boolean; children: ReactNode }) {
  const link = (
    <Link className={buttonClass(variant, className)} {...props}>
      {children}
    </Link>
  );
  return magnetic ? <Magnetic>{link}</Magnetic> : link;
}
