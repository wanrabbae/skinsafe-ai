import { Bell, UserRound } from "lucide-react";

import { SkinProfileIntake } from "@/modules/profile";
import { PageMain } from "@/shared/components/page-main";
import { BrandLockup, IconButton, MicroLabel } from "@/shared/components/primitives";

export function ProfileView() {
  return (
    <PageMain>
      <header className="mb-5 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div
          className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-surface-lowest bg-primary-soft text-primary-strong shadow-[0_4px_12px_rgb(83_0_183/12%)] [&_svg]:size-[19px]"
          aria-hidden="true"
        >
          <UserRound />
        </div>
        <BrandLockup className="justify-self-center" />
        <IconButton aria-label="Buka notifikasi">
          <Bell aria-hidden="true" />
        </IconButton>
      </header>

      <header className="flex items-end justify-between gap-4">
        <div>
          <MicroLabel>PROFIL PRIBADI</MicroLabel>
          <h1 className="mt-[5px] text-[1.72rem] font-bold leading-[1.22] tracking-[-0.03em]">
            Ceritakan kulitmu
          </h1>
          <p className="mt-[3px] text-[0.8rem] text-on-surface-variant">
            Jawabanmu diproses lokal oleh service SkinSafe AI.
          </p>
        </div>
      </header>

      <SkinProfileIntake />
    </PageMain>
  );
}
