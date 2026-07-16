"use client";

import { ClipboardList, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";

import { ProfileResult, useProfileResult } from "@/modules/profile";
import { clearProfileResult } from "@/modules/profile/profile-storage";
import { PageMain } from "@/shared/components/page-main";
import { MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";

import { HomeHeader } from "../home/home-header";

export function TestResultView() {
  const { result, loaded } = useProfileResult();

  return (
    <PageMain>
      <HomeHeader />

      <div>
        <MicroLabel>HASIL KAMU</MicroLabel>
        <h1 className="mt-1.5 text-[1.72rem] font-bold leading-[1.22] tracking-[-0.03em]">
          Profil &amp; rekomendasi
        </h1>
      </div>

      {loaded && !result ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-6 text-center shadow-card">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-6">
            <ClipboardList aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[1rem] font-bold">Belum ada hasil</h2>
            <p className="mt-1 text-[0.8rem] leading-normal text-on-surface-variant">
              Lakukan tes profil kulit dulu untuk melihat rekomendasi.
            </p>
          </div>
          <Button asChild variant="primary" size="pill" className="mt-1">
            <Link href="/test">Mulai tes profil kulit</Link>
          </Button>
        </div>
      ) : null}

      {result ? (
        <>
          <ProfileResult result={result} />
          <div className="mt-5 grid gap-2.5">
            <Button asChild variant="secondary" size="pill">
              <Link href="/test">
                <RotateCcw aria-hidden="true" />
                Tes ulang
              </Link>
            </Button>
            <Button
              type="button"
              variant="text"
              size="pill"
              className="text-danger"
              onClick={() => clearProfileResult()}
            >
              <Trash2 aria-hidden="true" />
              Hapus profil kulit
            </Button>
          </div>
        </>
      ) : null}
    </PageMain>
  );
}
