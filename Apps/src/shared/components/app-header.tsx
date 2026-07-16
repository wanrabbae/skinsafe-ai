"use client";

import { ArrowLeft, Bell, BellOff, UserRound } from "lucide-react";
import Link from "next/link";

import { BrandLockup, IconButton } from "@/shared/components/primitives";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

export function AppHeader({ backHref }: { backHref?: string }) {
  return (
    <header className="mb-[18px] flex items-center justify-between">
      <div className="flex items-center gap-1">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Kembali"
            className="relative inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-container [&_svg]:size-5"
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        ) : null}
        <BrandLockup />
      </div>
      <div className="flex gap-0.5">
        <Popover>
          <PopoverTrigger asChild>
            <IconButton aria-label="Buka notifikasi">
              <Bell aria-hidden="true" />
            </IconButton>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col items-center gap-2 px-2 py-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-surface-container text-outline [&_svg]:size-5">
                <BellOff aria-hidden="true" />
              </span>
              <p className="text-[0.85rem] font-bold">Belum ada notifikasi</p>
              <p className="text-[0.72rem] leading-normal text-on-surface-variant">
                Pemberitahuan tentang profil dan hasil analisismu akan muncul di sini.
              </p>
            </div>
          </PopoverContent>
        </Popover>
        <IconButton aria-label="Buka profil">
          <UserRound aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}
