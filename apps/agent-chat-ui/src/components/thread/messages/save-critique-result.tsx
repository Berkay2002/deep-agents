import { MessageSquare, AlertCircle } from "lucide-react";

type CritiqueFinding = {
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  suggestion: string;
  location: string;
};

type SaveCritiqueResult = {
  category: string;
  findings: CritiqueFinding[];
  totalIssues: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  metadata?: Record<string, unknown>;
  timestamp: string;
};

export function SaveCritiqueResult({ result }: { result: SaveCritiqueResult }) {
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "structure":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "completeness":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "accuracy":
        return "bg-green-100 text-green-700 border-green-200";
      case "clarity":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "citations":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-700 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return "⚠️";
      case "medium":
        return "⚡";
      case "low":
        return "ℹ️";
      default:
        return "•";
    }
  };

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-700" />
            <h3 className="font-semibold text-slate-900">Critique Saved</h3>
          </div>
          <div className="mt-2">
            <span
              className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${getCategoryColor(result.category)}`}
            >
              {result.category}
            </span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Severity Breakdown
          </h4>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-2">
              <div className="text-2xl font-bold text-red-600">
                {result.severityBreakdown.critical}
              </div>
              <div className="text-xs text-red-700 font-medium">Critical</div>
            </div>
            <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-2">
              <div className="text-2xl font-bold text-orange-600">
                {result.severityBreakdown.high}
              </div>
              <div className="text-xs text-orange-700 font-medium">High</div>
            </div>
            <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-2">
              <div className="text-2xl font-bold text-yellow-600">
                {result.severityBreakdown.medium}
              </div>
              <div className="text-xs text-yellow-700 font-medium">Medium</div>
            </div>
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-2">
              <div className="text-2xl font-bold text-blue-600">
                {result.severityBreakdown.low}
              </div>
              <div className="text-xs text-blue-700 font-medium">Low</div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{result.totalIssues}</span> total
              {result.totalIssues === 1 ? " issue" : " issues"} found
            </p>
          </div>
        </div>

        {/* Latest Findings */}
        <div className="bg-white px-4 py-3">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <AlertCircle className="h-4 w-4 text-slate-500" />
            Latest Findings
          </h4>
          <div className="space-y-3">
            {result.findings.slice(-5).map((finding, index) => (
              <div
                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                key={`finding-${index}-${finding.issue.substring(0, 20)}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-sm">
                      {getSeverityIcon(finding.severity)}
                    </span>
                    <p className="flex-1 text-sm font-medium text-gray-900">
                      {finding.issue}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getSeverityColor(finding.severity)}`}
                  >
                    {finding.severity}
                  </span>
                </div>
                <div className="ml-6 space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600">Suggestion:</span>
                    <p className="text-xs text-gray-700">{finding.suggestion}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600">Location:</span>
                    <p className="text-xs text-gray-600">{finding.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {result.findings.length > 5 && (
            <p className="mt-3 text-center text-xs text-gray-500">
              Showing last 5 of {result.findings.length} findings
            </p>
          )}
        </div>

        {/* Timestamp */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
          <p className="text-xs text-slate-700">
            Saved at {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
