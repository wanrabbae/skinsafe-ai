"use client";

import Link from "next/link";
import { House, ScanLine, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/utils";

const navItems = [
  { href: "/", label: "Beranda", icon: House },
  { href: "/scan", label: "Scan", icon: ScanLine, primary: true },
  { href: "/recommendation", label: "Recommendation", icon: Sparkles },
];

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed left-1/2 bottom-[max(12px,env(safe-area-inset-bottom))] z-50 grid h-[68px] w-[calc(100%-24px)] max-w-[416px] -translate-x-1/2 grid-cols-3 items-end gap-0.5 rounded-3xl border border-[rgb(109_40_217/9%)] bg-white/96 px-[7px] pt-[7px] pb-[6px] shadow-floating data-[offline=true]:opacity-[0.68]"
      data-offline={pathname === "/offline"}
      aria-label="Navigasi utama"
    >
      {navItems.map(({ href, label, icon: Icon, primary }) => {
        const route = href.split("#")[0];
        const active = primary
          ? pathname === "/scan"
          : href.includes("#")
            ? false
            : route === "/"
              ? pathname === "/"
              : pathname.startsWith(route);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex h-[50px] min-w-0 flex-col items-center justify-center gap-[3px] rounded-[18px] text-[0.57rem] font-[650] text-on-surface-variant max-[360px]:text-[0.52rem] hover:bg-surface-low hover:text-primary-strong data-[active=true]:text-primary-strong",
              primary && "gap-px overflow-visible hover:bg-transparent",
            )}
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            <span
              className={
                primary
                  ? "-mt-[27px] flex h-[56px] w-[56px] items-center justify-center rounded-full border-[5px] border-surface bg-primary text-white shadow-[0_10px_24px_rgb(83_0_183/32%)] transition-[transform,background-color] duration-[160ms] ease-[ease] [&_svg]:size-[23px] group-hover:-translate-y-0.5 group-hover:bg-primary-strong group-data-[active=true]:-translate-y-0.5 group-data-[active=true]:bg-primary-strong"
                  : "flex h-[29px] w-[38px] items-center justify-center rounded-full [&_svg]:size-[19px] group-data-[active=true]:bg-primary-soft"
              }
            >
              <Icon aria-hidden="true" strokeWidth={2.2} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
