import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

export function PageMain({ className, ...props }: ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "mx-auto min-h-[100svh] w-full pt-5 px-[18px] pb-[calc(108px+env(safe-area-inset-bottom))] max-[360px]:px-4 min-[700px]:pt-8",
        className,
      )}
      {...props}
    />
  );
}
