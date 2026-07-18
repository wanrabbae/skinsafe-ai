"use client";

import { CircleCheck, Leaf, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import type { IngredientKnowledge } from "@/modules/ingredient";
import { formatProfileLabel } from "@/modules/profile";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { cn } from "@/shared/lib/utils";

const cardShell =
  "rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-[18px] shadow-card";

const itemShell = "rounded-[14px] bg-safe-soft p-3";

function normalize(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", " ");
}

function relevanceForYou(relevantConcerns: string[], profileCodes: string[]): string[] {
  const profile = new Set(profileCodes.map(normalize));
  return [...new Set(relevantConcerns.filter((concern) => profile.has(normalize(concern))))];
}

async function fetchKnowledge(name: string): Promise<IngredientKnowledge | null> {
  try {
    const response = await fetch(`/api/v1/ingredients/${encodeURIComponent(name)}`);
    if (!response.ok) return null;
    return (await response.json()) as IngredientKnowledge;
  } catch {
    return null;
  }
}

type KnownEntry = { name: string; data: IngredientKnowledge };

type SplitEntries = {
  known: KnownEntry[];
  unknown: string[];
};

export function RecommendedChemicalsAccordion({
  chemicals,
  profileCodes,
}: {
  chemicals: string[];
  /** Concern + condition codes from the user's skin profile. */
  profileCodes: string[];
}) {
  const [entries, setEntries] = useState<SplitEntries | null>(null);
  const [open, setOpen] = useState<string | undefined>();
  const chemicalsKey = chemicals.join("\0");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const names = chemicalsKey ? chemicalsKey.split("\0") : [];
      const results = await Promise.all(
        names.map(async (name) => {
          const data = await fetchKnowledge(name);
          return { name, data };
        }),
      );
      if (cancelled) return;
      const known: KnownEntry[] = [];
      const unknown: string[] = [];
      for (const item of results) {
        if (item.data) known.push({ name: item.name, data: item.data });
        else unknown.push(item.name);
      }
      setEntries({ known, unknown });
    })();
    return () => {
      cancelled = true;
    };
  }, [chemicalsKey]);

  if (entries === null) {
    return (
      <section className={cn(cardShell, "mt-4")} aria-labelledby="recommended-title">
        <div className="flex items-center gap-2.5">
          <CircleCheck aria-hidden="true" className="size-[18px] text-safe" />
          <h2 id="recommended-title" className="text-[0.95rem] font-bold">
            Kandungan yang Dianjurkan
          </h2>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[0.75rem] text-on-surface-variant">
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
          Memuat kandungan…
        </p>
      </section>
    );
  }

  if (!entries.known.length && !entries.unknown.length) return null;

  return (
    <section className={cn(cardShell, "mt-4")} aria-labelledby="recommended-title">
      <div className="flex items-center gap-2.5">
        <CircleCheck aria-hidden="true" className="size-[18px] text-safe" />
        <h2 id="recommended-title" className="text-[0.95rem] font-bold">
          Kandungan yang Dianjurkan
        </h2>
      </div>

      <div className="mt-3 space-y-2">
        {entries.known.length ? (
          <Accordion
            type="single"
            collapsible
            value={open}
            onValueChange={(value) => setOpen(value || undefined)}
            className="space-y-2"
          >
            {entries.known.map(({ name, data }) => {
              const matched = relevanceForYou(data.relevantConcerns, profileCodes);
              return (
                <AccordionItem
                  key={name}
                  value={name}
                  className="rounded-[14px] border-0 bg-safe-soft shadow-none"
                >
                  <AccordionTrigger className="p-3 text-[0.8rem] text-safe [&_svg]:text-safe">
                    <Leaf aria-hidden="true" className="size-[15px] shrink-0 text-safe" />
                    <span className="flex-1 capitalize">{name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3 pt-0 text-[0.75rem] leading-snug text-on-surface-variant">
                    <div className="space-y-1.5">
                      {data.benefits ? (
                        <p>
                          <strong className="font-semibold text-on-surface">Manfaat:</strong>{" "}
                          {data.benefits}
                        </p>
                      ) : null}
                      {matched.length ? (
                        <p>
                          <strong className="font-semibold text-on-surface">
                            Cocok untuk profilmu:
                          </strong>{" "}
                          {matched.map(formatProfileLabel).join(", ")}
                        </p>
                      ) : null}
                      {!data.benefits && !matched.length ? (
                        <p>Belum ada ringkasan manfaat untuk bahan ini.</p>
                      ) : null}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : null}

        {entries.unknown.map((name) => (
          <div className={itemShell} key={name}>
            <div className="flex items-center gap-2 [&_svg]:size-[15px]">
              <Leaf aria-hidden="true" className="text-safe" />
              <h3 className="text-[0.8rem] font-bold capitalize text-safe">{name}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
