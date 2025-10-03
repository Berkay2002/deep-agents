import { Target, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

type AnalyzeCompletenessResult = {
  reportPath: string;
  questionPath: string;
  coverageScore: number;
  coveredAreas: string[];
  missingAreas: string[];
  recommendations: string[];
  questionAlignment: string;
  expectedAreaCount: number;
  coveredAreaCount: number;
  timestamp: string;
};

export function AnalyzeCompletenessResult({
  result,
}: {
  result: AnalyzeCompletenessResult;
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

  const getAlignmentColor = (alignment: string) => {
    switch (alignment.toLowerCase()) {
      case "excellent":
        return "bg-green-100 text-green-700 border-green-200";
      case "good":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "needs improvement":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const coveragePercentage = result.expectedAreaCount > 0
    ? Math.round((result.coveredAreaCount / result.expectedAreaCount) * 100)
    : 100;

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-indigo-200 bg-indigo-50">
        {/* Header */}
        <div className="border-b border-indigo-200 bg-indigo-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-700" />
            <h3 className="font-semibold text-indigo-900">
              Completeness Analysis
            </h3>
          </div>
          <div className="mt-1 flex gap-2 text-xs text-indigo-700">
            <span>Report: {result.reportPath}</span>
            <span>•</span>
            <span>Question: {result.questionPath}</span>
          </div>
        </div>

        {/* Overall Score */}
        <div
          className={`border-b border-gray-200 px-4 py-4 ${getScoreBgColor(result.coverageScore)}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-700">
                Coverage Score
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                How comprehensively the report addresses the topic
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-6 w-6 ${getScoreColor(result.coverageScore)}`} />
              <span className={`text-4xl font-bold ${getScoreColor(result.coverageScore)}`}>
                {result.coverageScore}
              </span>
              <span className="text-xl text-gray-500">/100</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {result.coveredAreaCount}/{result.expectedAreaCount}
              </div>
              <div className="text-xs text-gray-600">Areas Covered</div>
              <div className="mt-1">
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${coveragePercentage}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {result.coveredAreas.length}
              </div>
              <div className="text-xs text-gray-600">Covered Topics</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {result.missingAreas.length}
              </div>
              <div className="text-xs text-gray-600">Missing Topics</div>
            </div>
          </div>
        </div>

        {/* Question Alignment */}
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            Question Alignment
          </h4>
          <span
            className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${getAlignmentColor(result.questionAlignment)}`}
          >
            {result.questionAlignment}
          </span>
        </div>

        {/* Covered Areas */}
        {result.coveredAreas.length > 0 && (
          <div className="border-b border-gray-200 bg-green-50 px-4 py-3">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-900">
              <CheckCircle2 className="h-4 w-4" />
              Covered Areas ({result.coveredAreas.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {result.coveredAreas.map((area, index) => (
                <span
                  className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                  key={`covered-${index}-${area}`}
                >
                  ✓ {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Areas */}
        {result.missingAreas.length > 0 && (
          <div className="border-b border-gray-200 bg-red-50 px-4 py-3">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-900">
              <XCircle className="h-4 w-4" />
              Missing Areas ({result.missingAreas.length})
            </h4>
            <div className="space-y-2">
              {result.missingAreas.map((area, index) => (
                <div
                  className="rounded-lg border border-red-200 bg-white p-2"
                  key={`missing-${index}-${area}`}
                >
                  <p className="text-sm text-red-800">✗ {area}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="bg-blue-50 px-4 py-3">
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

        {/* Timestamp */}
        <div className="border-t border-indigo-200 bg-indigo-50 px-4 py-2">
          <p className="text-xs text-indigo-700">
            Analyzed at {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
