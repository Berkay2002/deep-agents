"use client";

import { AlertTriangle, Lightbulb, TrendingUp, Zap } from "lucide-react";

type PlanOptimizationResultProps = {
  result: {
    optimizedPlan?: string[];
    identifiedGaps?: string[];
    suggestionsForImprovement?: string[];
    estimatedImprovement?: string;
  };
};

const KEY_PREFIX_LENGTH = 20;

export function PlanOptimizationResult({
  result,
}: PlanOptimizationResultProps) {
  const {
    optimizedPlan = [],
    identifiedGaps = [],
    suggestionsForImprovement = [],
    estimatedImprovement = "",
  } = result;

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-emerald-200 bg-white">
        {/* Header */}
        <div className="border-emerald-200 border-b bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Plan Optimization
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 p-4">
          {/* Estimated Improvement */}
          {estimatedImprovement && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Estimated Improvement
                  </p>
                  <p className="mt-0.5 font-semibold text-emerald-700 text-sm">
                    {estimatedImprovement}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Optimized Plan */}
          {optimizedPlan.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                <h4 className="font-medium text-gray-700 text-sm">
                  Optimized Plan
                </h4>
              </div>
              <ol className="space-y-2">
                {optimizedPlan.map((task, index) => (
                  <li
                    className="flex items-start gap-3 text-gray-700 text-sm"
                    key={`optimized-plan-${index}-${task.slice(0, KEY_PREFIX_LENGTH)}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 text-xs">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{task}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Identified Gaps */}
          {identifiedGaps.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <h4 className="font-medium text-gray-700 text-sm">
                  Identified Gaps
                </h4>
              </div>
              <div className="space-y-2">
                {identifiedGaps.map((gap, index) => (
                  <div
                    className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                    key={`identified-gap-${index}-${gap.slice(0, KEY_PREFIX_LENGTH)}`}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-amber-900 text-sm">{gap}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions for Improvement */}
          {suggestionsForImprovement.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-blue-600" />
                <h4 className="font-medium text-gray-700 text-sm">
                  Suggestions for Improvement
                </h4>
              </div>
              <div className="space-y-2">
                {suggestionsForImprovement.map((suggestion, index) => (
                  <div
                    className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2"
                    key={`suggestion-${index}-${suggestion.slice(0, KEY_PREFIX_LENGTH)}`}
                  >
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <p className="text-blue-900 text-sm">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
