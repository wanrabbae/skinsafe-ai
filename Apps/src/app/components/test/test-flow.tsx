"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  fetchRecommendations,
  ProfilePersonalization,
  saveProfileResult,
  SkinProfileIntake,
  useProfileResult,
} from "@/modules/profile";
import type { QuestionChoice, ResolvedSkinProfile } from "@/modules/profile";
import { MicroLabel } from "@/shared/components/primitives";

const loader = (
  <p className="mt-8 flex items-center justify-center gap-2 text-[0.8rem] text-on-surface-variant [&_svg]:size-[18px]">
    <LoaderCircle className="spin" aria-hidden="true" /> Memuat…
  </p>
);

export function TestFlow() {
  const router = useRouter();
  const { result, loaded } = useProfileResult();
  const [submitting, setSubmitting] = useState(false);

  async function onFinish(
    profile: ResolvedSkinProfile,
    answers: Record<string, QuestionChoice>,
    completed: boolean,
  ) {
    if (!result) return;
    setSubmitting(true);
    const recommendations = completed ? await fetchRecommendations(profile) : null;
    saveProfileResult({
      resolution: { ...result.resolution, profile },
      flow: {
        stage: completed ? "final" : "review",
        personalizationAnswers: answers,
        pendingPersonalization: false,
      },
      recommendations,
    });
    router.push("/test/hasil");
  }

  if (!loaded) return loader;

  if (submitting) {
    return (
      <p className="mt-8 flex items-center justify-center gap-2 text-[0.8rem] text-on-surface-variant [&_svg]:size-[18px]">
        <LoaderCircle className="spin" aria-hidden="true" /> Menyiapkan hasil…
      </p>
    );
  }

  if (result?.flow?.pendingPersonalization) {
    return (
      <ProfilePersonalization
        initialProfile={result.resolution.profile}
        initialAnswers={result.flow.personalizationAnswers ?? {}}
        onFinish={onFinish}
      />
    );
  }

  return (
    <>
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
    </>
  );
}
