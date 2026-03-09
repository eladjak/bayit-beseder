"use client";

import { GoldenRuleRing } from "@/components/dashboard/golden-rule-ring";
import { RingSkeleton } from "@/components/skeleton";

interface GoldenRuleSectionProps {
  percentage: number;
  target: number;
  loading: boolean;
}

export function GoldenRuleSection({ percentage, target, loading }: GoldenRuleSectionProps) {
  return (
    <div className="flex justify-center card-premium p-5 shadow-lg shadow-primary/8">
      {loading ? (
        <RingSkeleton />
      ) : (
        <GoldenRuleRing percentage={percentage} target={target} />
      )}
    </div>
  );
}
