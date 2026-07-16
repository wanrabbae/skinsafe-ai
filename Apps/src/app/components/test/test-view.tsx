import { SkinProfileIntake } from "@/modules/profile";
import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";
import { MicroLabel } from "@/shared/components/primitives";

export function TestView() {
  return (
    <PageMain>
      <AppHeader />

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
