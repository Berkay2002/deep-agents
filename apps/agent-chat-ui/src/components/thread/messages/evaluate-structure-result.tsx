import { FileText, AlertCircle, TrendingUp } from "lucide-react";

type HeadingInfo = {
  level: number;
  title: string;
  line: number;
};

type StructureIssue = {
  issue: string;
  severity: string;
  location: string;
};

type EvaluateStructureResult = {
  reportPath: string;
  sectionCount: number;
  mainSections: number;
  headingHierarchy: HeadingInfo[];
  paragraphCount: number;
  wordCount: number;
  paragraphsPerSection: Record<string, number>;
  issues: StructureIssue[];
  recommendations: string[];
  score: number;
  timestamp: string;
};

export function EvaluateStructureResult({
  result,
}: {
  result: EvaluateStructureResult;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
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

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-purple-200 bg-purple-50">
        {/* Header */}
        <div className="border-b border-purple-200 bg-purple-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-700" />
            <h3 className="font-semibold text-purple-900">
              Structure Evaluation
            </h3>
          </div>
          <p className="mt-1 text-sm text-purple-700">{result.reportPath}</p>
        </div>

        {/* Overall Score */}
        <div
          className={`border-b border-gray-200 px-4 py-4 ${getScoreBgColor(result.score)}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-700">
                Overall Structure Score
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                Based on organization, hierarchy, and balance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-6 w-6 ${getScoreColor(result.score)}`} />
              <span className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}
              </span>
              <span className="text-xl text-gray-500">/100</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {result.sectionCount}
              </div>
              <div className="text-xs text-gray-600">Total Sections</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {result.mainSections}
              </div>
              <div className="text-xs text-gray-600">Main Sections</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {result.paragraphCount}
              </div>
              <div className="text-xs text-gray-600">Paragraphs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {result.wordCount}
              </div>
              <div className="text-xs text-gray-600">Words</div>
            </div>
          </div>
        </div>

        {/* Issues */}
        {result.issues.length > 0 && (
          <div className="border-b border-gray-200 bg-white px-4 py-3">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Issues Found ({result.issues.length})
            </h4>
            <div className="space-y-2">
              {result.issues.map((issue, index) => (
                <div
                  className="rounded-lg border bg-white p-3"
                  key={`issue-${index}-${issue.issue.substring(0, 20)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 text-sm text-gray-900">{issue.issue}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getSeverityColor(issue.severity)}`}
                    >
                      {issue.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Location: {issue.location}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="border-b border-gray-200 bg-blue-50 px-4 py-3">
            <h4 className="mb-2 text-sm font-semibold text-blue-900">
              Recommendations
            </h4>
            <ul className="space-y-1">
              {result.recommendations.map((rec, index) => (
                <li
                  className="text-sm text-blue-800"
                  key={`rec-${index}-${rec.substring(0, 20)}`}
                >
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Heading Hierarchy Preview */}
        <div className="bg-white px-4 py-3">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Heading Hierarchy (Preview)
          </h4>
          <div className="space-y-1 overflow-auto max-h-48">
            {result.headingHierarchy.slice(0, 10).map((heading, index) => (
              <div
                className="flex items-center gap-2 text-sm"
                key={`heading-${index}-${heading.title.substring(0, 20)}`}
                style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
              >
                <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  H{heading.level}
                </span>
                <span className="text-gray-900">{heading.title}</span>
                <span className="text-xs text-gray-500">Line {heading.line}</span>
              </div>
            ))}
          </div>
          {result.headingHierarchy.length > 10 && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Showing first 10 of {result.headingHierarchy.length} headings
            </p>
          )}
        </div>

        {/* Timestamp */}
        <div className="border-t border-purple-200 bg-purple-50 px-4 py-2">
          <p className="text-xs text-purple-700">
            Evaluated at {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
