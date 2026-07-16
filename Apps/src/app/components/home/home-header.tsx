import { Bell, UserRound } from "lucide-react";

import { BrandLockup, IconButton } from "@/shared/components/primitives";

export function HomeHeader() {
  return (
    <header className="mb-[18px] flex items-center justify-between">
      <BrandLockup />
      <div className="flex gap-0.5">
        <IconButton aria-label="Buka notifikasi">
          <Bell aria-hidden="true" />
        </IconButton>
        <IconButton aria-label="Buka profil">
          <UserRound aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}
