"use client";

import Link from "next/link";
import { Bookmark, History, House, ScanLine, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Beranda", icon: House },
  { href: "/history", label: "Riwayat", icon: History },
  { href: "/scan", label: "Scan", icon: ScanLine, primary: true },
  { href: "/history#saved", label: "Tersimpan", icon: Bookmark },
  { href: "/profile", label: "Profil", icon: UserRound },
];

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="bottom-nav"
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
            className={primary ? "nav-item nav-item-scan" : "nav-item"}
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            <span className={primary ? "scan-fab" : "nav-icon"}>
              <Icon aria-hidden="true" strokeWidth={2.2} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
