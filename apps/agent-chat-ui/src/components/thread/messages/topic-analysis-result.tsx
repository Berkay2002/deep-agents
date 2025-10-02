"use client";

import { Clock, Tag, Target, BookOpen, Lightbulb } from "lucide-react";

interface TopicAnalysisResultProps {
  result: {
    topicType?: string;
    complexity?: string;
    estimatedResearchAreas?: string[];
    suggestedSources?: string[];
    estimatedTimeframe?: string;
  };
}

function getTopicTypeBadgeColor(topicType: string): string {
  const colors: Record<string, string> = {
    technical: "bg-blue-100 text-blue-700 border-blue-300",
    academic: "bg-purple-100 text-purple-700 border-purple-300",
    business: "bg-green-100 text-green-700 border-green-300",
    creative: "bg-pink-100 text-pink-700 border-pink-300",
    general: "bg-gray-100 text-gray-700 border-gray-300",
  };
  return colors[topicType.toLowerCase()] || colors.general;
}

function getComplexityBadgeColor(complexity: string): string {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-700 border-green-300",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
    high: "bg-red-100 text-red-700 border-red-300",
  };
  return colors[complexity.toLowerCase()] || colors.medium;
}

export function TopicAnalysisResult({ result }: TopicAnalysisResultProps) {
  const {
    topicType = "general",
    complexity = "medium",
    estimatedResearchAreas = [],
    suggestedSources = [],
    estimatedTimeframe = "Unknown",
  } = result;

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-emerald-200 bg-white">
        {/* Header */}
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Topic Analysis
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Topic Type & Complexity */}
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                Topic Type
              </label>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${getTopicTypeBadgeColor(
                  topicType
                )}`}
              >
                <Tag className="h-3 w-3" />
                {topicType.charAt(0).toUpperCase() + topicType.slice(1)}
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                Complexity
              </label>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${getComplexityBadgeColor(
                  complexity
                )}`}
              >
                <Target className="h-3 w-3" />
                {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                Estimated Timeframe
              </label>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300">
                <Clock className="h-3 w-3" />
                {estimatedTimeframe}
              </span>
            </div>
          </div>

          {/* Research Areas */}
          {estimatedResearchAreas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-emerald-600" />
                <h4 className="text-sm font-medium text-gray-700">
                  Key Research Areas
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {estimatedResearchAreas.map((area, index) => (
                  <span
                    key={index}
                    className="inline-block px-2.5 py-1 rounded-md text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Sources */}
          {suggestedSources.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                <h4 className="text-sm font-medium text-gray-700">
                  Suggested Sources
                </h4>
              </div>
              <ul className="space-y-1.5">
                {suggestedSources.map((source, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-600 flex items-start gap-2"
                  >
                    <span className="text-emerald-600 mt-0.5">•</span>
                    <span>{source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
