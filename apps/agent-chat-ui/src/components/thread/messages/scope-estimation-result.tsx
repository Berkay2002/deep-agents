"use client";

import React from "react";
import { Clock, CheckCircle2, AlertCircle, Briefcase } from "lucide-react";

interface ResearchTask {
  area: string;
  estimatedTime: number;
  priority: "high" | "medium" | "low";
}

interface ScopeEstimationResultProps {
  result: {
    estimatedTotalHours?: number;
    researchTasks?: ResearchTask[];
    suggestedMilestones?: string[];
    resourceRequirements?: {
      searchTools?: string[];
      timeAllocation?: string;
      expertiseLevel?: string;
    };
  };
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: "text-red-600 bg-red-50",
    medium: "text-yellow-600 bg-yellow-50",
    low: "text-blue-600 bg-blue-50",
  };
  return colors[priority.toLowerCase()] || colors.medium;
}

function getPriorityIcon(priority: string) {
  switch (priority.toLowerCase()) {
    case "high":
      return <AlertCircle className="h-3 w-3" />;
    case "low":
      return <CheckCircle2 className="h-3 w-3" />;
    case "medium":
    default:
      return <Clock className="h-3 w-3" />;
  }
}

export function ScopeEstimationResult({ result }: ScopeEstimationResultProps) {
  const {
    estimatedTotalHours = 0,
    researchTasks = [],
    suggestedMilestones = [],
    resourceRequirements = {},
  } = result;

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-emerald-200 bg-white">
        {/* Header */}
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Scope Estimation
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Estimated Total Hours */}
          {estimatedTotalHours > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-full">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Estimated Total Time
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {estimatedTotalHours} {estimatedTotalHours === 1 ? "hour" : "hours"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Research Tasks */}
          {researchTasks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Research Tasks
              </h4>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Area
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Time
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Priority
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {researchTasks.map((task, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {task.area}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {task.estimatedTime} {task.estimatedTime === 1 ? "hr" : "hrs"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                              task.priority
                            )}`}
                          >
                            {getPriorityIcon(task.priority)}
                            {task.priority.charAt(0).toUpperCase() +
                              task.priority.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Suggested Milestones */}
          {suggestedMilestones.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <h4 className="text-sm font-medium text-gray-700">
                  Suggested Milestones
                </h4>
              </div>
              <ol className="space-y-2">
                {suggestedMilestones.map((milestone, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-sm text-gray-600"
                  >
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{milestone}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Resource Requirements */}
          {Object.keys(resourceRequirements).length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Resource Requirements
              </h4>
              <div className="space-y-2 text-sm">
                {resourceRequirements.searchTools && (
                  <div>
                    <span className="font-medium text-gray-600">Search Tools:</span>{" "}
                    <span className="text-gray-700">
                      {resourceRequirements.searchTools.join(", ")}
                    </span>
                  </div>
                )}
                {resourceRequirements.timeAllocation && (
                  <div>
                    <span className="font-medium text-gray-600">Time Allocation:</span>{" "}
                    <span className="text-gray-700">
                      {resourceRequirements.timeAllocation}
                    </span>
                  </div>
                )}
                {resourceRequirements.expertiseLevel && (
                  <div>
                    <span className="font-medium text-gray-600">Expertise Level:</span>{" "}
                    <span className="text-gray-700">
                      {resourceRequirements.expertiseLevel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
