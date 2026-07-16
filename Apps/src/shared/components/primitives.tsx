import { cva, type VariantProps } from "class-variance-authority";
import { ShieldCheck } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

export function MicroLabel({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-primary-strong text-[0.62rem] font-bold tracking-[0.08em] leading-4 uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function BrandLockup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center text-primary-strong text-[0.85rem] font-[750] gap-[7px]",
        className,
      )}
      {...props}
    >
      <span className="inline-flex items-center justify-center">
        <ShieldCheck aria-hidden="true" className="size-[19px]" />
      </span>
      <span>SkinSafe AI</span>
    </div>
  );
}

export function IconButton({ className, type = "button", ref, ...props }: ComponentProps<"button">) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent cursor-pointer hover:bg-surface-container [&_svg]:size-5",
        className,
      )}
      {...props}
    />
  );
}

const cardIconVariants = cva(
  "inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[16px] [&_svg]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-surface-lowest text-primary",
        primary: "bg-primary text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function CardIcon({
  className,
  variant,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof cardIconVariants>) {
  return <div className={cn(cardIconVariants({ variant }), className)} {...props} />;
}

const chipVariants = cva(
  "inline-flex items-center rounded-full text-[0.6rem] font-[650] leading-none min-h-[22px] px-2 py-1",
  {
    variants: {
      tone: {
        neutral: "bg-surface-container text-on-surface-variant",
        safe: "bg-safe-soft text-safe",
        caution: "bg-caution-soft text-caution",
        danger: "bg-danger-soft text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Chip({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
  return <span className={cn(chipVariants({ tone }), className)} {...props} />;
}
