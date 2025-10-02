"use client";

import { Zap, AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";

interface PlanOptimizationResultProps {
  result: {
    optimizedPlan?: string[];
    identifiedGaps?: string[];
    suggestionsForImprovement?: string[];
    estimatedImprovement?: string;
  };
}

export function PlanOptimizationResult({ result }: PlanOptimizationResultProps) {
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
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Plan Optimization
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Estimated Improvement */}
          {estimatedImprovement && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-full">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Estimated Improvement
                  </p>
                  <p className="text-sm font-semibold text-emerald-700 mt-0.5">
                    {estimatedImprovement}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Optimized Plan */}
          {optimizedPlan.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                <h4 className="text-sm font-medium text-gray-700">
                  Optimized Plan
                </h4>
              </div>
              <ol className="space-y-2">
                {optimizedPlan.map((task, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-sm text-gray-700"
                  >
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
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
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <h4 className="text-sm font-medium text-gray-700">
                  Identified Gaps
                </h4>
              </div>
              <div className="space-y-2">
                {identifiedGaps.map((gap, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">{gap}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions for Improvement */}
          {suggestionsForImprovement.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-3.5 w-3.5 text-blue-600" />
                <h4 className="text-sm font-medium text-gray-700">
                  Suggestions for Improvement
                </h4>
              </div>
              <div className="space-y-2">
                {suggestionsForImprovement.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2"
                  >
                    <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">{suggestion}</p>
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
