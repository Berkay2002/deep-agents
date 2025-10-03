"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const CARD_BASE_CLASSES =
  "relative scroll-mt-28 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm transition-colors";

export type AnswerCardProps = {
  anchorId: string;
  children: ReactNode;
  className?: string;
};

export function AnswerCard({ anchorId, children, className }: AnswerCardProps) {
  return (
    <section className={cn(CARD_BASE_CLASSES, className)} id={anchorId}>
      {children}
    </section>
  );
}
