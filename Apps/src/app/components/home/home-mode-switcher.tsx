"use client";

import { useState } from "react";

import { useProfileResult } from "@/modules/profile";

import { HomeOnboardingView } from "./home-onboarding-view";
import { HomeWithProfileView } from "./home-with-profile-view";

type HomeVariant = "with-profile" | "onboarding";

export function HomeModeSwitcher() {
  const { result, loaded } = useProfileResult();
  const [override, setOverride] = useState<HomeVariant | null>(null);

  if (!loaded) return null;

  const variant: HomeVariant = override ?? (result ? "with-profile" : "onboarding");

  return (
    <>
      {variant === "with-profile" ? <HomeWithProfileView /> : <HomeOnboardingView />}
      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          className="fixed bottom-24 left-1/2 z-40 max-w-[260px] -translate-x-1/2 whitespace-nowrap rounded-full border-0 bg-caution-bright px-[14px] py-2 text-[0.62rem] font-bold text-white shadow-floating cursor-pointer active:scale-[0.97]"
          onClick={() =>
            setOverride(variant === "with-profile" ? "onboarding" : "with-profile")
          }
        >
          {variant === "with-profile" ? "Lihat: belum ada profil" : "Lihat: sudah ada profil"}
        </button>
      )}
    </>
  );
}
