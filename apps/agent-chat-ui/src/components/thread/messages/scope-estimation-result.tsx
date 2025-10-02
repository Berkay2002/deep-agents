"use client";

import { AlertCircle, Briefcase, CheckCircle2, Clock } from "lucide-react";

type ResearchTask = {
  area: string;
  estimatedTime: number;
  priority: "high" | "medium" | "low";
};

type ScopeEstimationResultProps = {
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
};

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
        <div className="border-emerald-200 border-b bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Scope Estimation
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 p-4">
          {/* Estimated Total Hours */}
          {estimatedTotalHours > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Estimated Total Time
                  </p>
                  <p className="font-bold text-2xl text-emerald-700">
                    {estimatedTotalHours}{" "}
                    {estimatedTotalHours === 1 ? "hour" : "hours"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Research Tasks */}
          {researchTasks.length > 0 && (
            <div>
              <h4 className="mb-3 font-medium text-gray-700 text-sm">
                Research Tasks
              </h4>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-4 py-2 text-left font-medium text-gray-500 text-xs uppercase tracking-wide"
                        scope="col"
                      >
                        Area
                      </th>
                      <th
                        className="px-4 py-2 text-left font-medium text-gray-500 text-xs uppercase tracking-wide"
                        scope="col"
                      >
                        Time
                      </th>
                      <th
                        className="px-4 py-2 text-left font-medium text-gray-500 text-xs uppercase tracking-wide"
                        scope="col"
                      >
                        Priority
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {researchTasks.map((task) => (
                      <tr
                        className="transition-colors hover:bg-gray-50"
                        key={`${task.area}-${task.priority}-${task.estimatedTime}`}
                      >
                        <td className="px-4 py-3 text-gray-700 text-sm">
                          {task.area}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {task.estimatedTime}{" "}
                          {task.estimatedTime === 1 ? "hr" : "hrs"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-xs ${getPriorityColor(
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
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <h4 className="font-medium text-gray-700 text-sm">
                  Suggested Milestones
                </h4>
              </div>
              <ol className="space-y-2">
                {suggestedMilestones.map((milestone, index) => (
                  <li
                    className="flex items-start gap-3 text-gray-600 text-sm"
                    key={`milestone-${index}-${milestone.substring(0, 10)}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 text-xs">
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
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-3 font-medium text-gray-700 text-sm">
                Resource Requirements
              </h4>
              <div className="space-y-2 text-sm">
                {resourceRequirements.searchTools && (
                  <div>
                    <span className="font-medium text-gray-600">
                      Search Tools:
                    </span>{" "}
                    <span className="text-gray-700">
                      {resourceRequirements.searchTools.join(", ")}
                    </span>
                  </div>
                )}
                {resourceRequirements.timeAllocation && (
                  <div>
                    <span className="font-medium text-gray-600">
                      Time Allocation:
                    </span>{" "}
                    <span className="text-gray-700">
                      {resourceRequirements.timeAllocation}
                    </span>
                  </div>
                )}
                {resourceRequirements.expertiseLevel && (
                  <div>
                    <span className="font-medium text-gray-600">
                      Expertise Level:
                    </span>{" "}
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
