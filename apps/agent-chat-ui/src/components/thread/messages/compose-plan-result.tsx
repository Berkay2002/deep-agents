import { Layers, FileText, Target, Map } from "lucide-react";

type ComposePlanResult = {
  event: "compose_plan_completed";
  topic: string;
  metadataPath: string;
  paths: {
    analysis: string;
    scope: string;
    plan: string;
    optimized: string;
    metadata: string;
  };
  summary: {
    topicType: string;
    complexity: string;
    estimatedTimeframe: string;
    taskCount: number;
    milestoneCount: number;
  };
  artifacts: {
    analysisPath: string;
    scopePath: string;
    planPath: string;
  };
  timestamp: string;
};

export function ComposePlanResult({ result }: { result: ComposePlanResult }) {
  const getComplexityColor = (complexity: string) => {
    switch (complexity.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getTopicTypeColor = (topicType: string) => {
    switch (topicType.toLowerCase()) {
      case "technical":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "academic":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "business":
        return "bg-green-100 text-green-700 border-green-200";
      case "creative":
        return "bg-pink-100 text-pink-700 border-pink-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-teal-200 bg-teal-50">
        {/* Header */}
        <div className="border-b border-teal-200 bg-teal-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-teal-700" />
            <h3 className="font-semibold text-teal-900">
              Research Plan Composed
            </h3>
          </div>
          <p className="mt-1 text-sm text-teal-700">{result.topic}</p>
        </div>

        {/* Plan Summary */}
        <div className="border-b border-teal-200 bg-white px-4 py-3">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Plan Overview
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-gray-600">Topic Type</span>
              <div className="mt-1">
                <span
                  className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getTopicTypeColor(result.summary.topicType)}`}
                >
                  {result.summary.topicType}
                </span>
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-600">Complexity</span>
              <div className="mt-1">
                <span
                  className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getComplexityColor(result.summary.complexity)}`}
                >
                  {result.summary.complexity}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-b border-teal-200 bg-white px-4 py-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-teal-600">
                {result.summary.taskCount}
              </div>
              <div className="text-xs text-gray-600">Research Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-600">
                {result.summary.milestoneCount}
              </div>
              <div className="text-xs text-gray-600">Milestones</div>
            </div>
            <div>
              <div className="text-lg font-bold text-teal-600">
                {result.summary.estimatedTimeframe}
              </div>
              <div className="text-xs text-gray-600">Est. Time</div>
            </div>
          </div>
        </div>

        {/* Generated Artifacts */}
        <div className="bg-white px-4 py-3">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Generated Artifacts
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <FileText className="h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Topic Analysis
                </p>
                <p className="text-xs text-gray-600 font-mono">
                  {result.artifacts.analysisPath}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <Target className="h-5 w-5 flex-shrink-0 text-purple-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Scope Estimation
                </p>
                <p className="text-xs text-gray-600 font-mono">
                  {result.artifacts.scopePath}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <Map className="h-5 w-5 flex-shrink-0 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Research Plan
                </p>
                <p className="text-xs text-gray-600 font-mono">
                  {result.artifacts.planPath}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="border-t border-teal-200 bg-teal-50 px-4 py-3">
          <h4 className="mb-2 text-sm font-semibold text-teal-900">
            Next Steps
          </h4>
          <ul className="space-y-1 text-xs text-teal-800">
            <li>• Use read_file to view detailed plan and task breakdown</li>
            <li>• Convert plan tasks to todos using write_todos</li>
            <li>• Begin research following the planned milestones</li>
          </ul>
        </div>

        {/* Timestamp */}
        <div className="border-t border-teal-200 bg-teal-50 px-4 py-2">
          <p className="text-xs text-teal-700">
            Created at {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
