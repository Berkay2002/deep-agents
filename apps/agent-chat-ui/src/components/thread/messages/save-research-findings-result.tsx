import { FileText, CheckCircle2, ExternalLink } from "lucide-react";

type Finding = {
  fact: string;
  source: string;
  category: string;
};

type SaveResearchFindingsResult = {
  topic: string;
  findings: Finding[];
  sources: string[];
  categories: string[];
  totalFindings: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
};

export function SaveResearchFindingsResult({
  result,
}: {
  result: SaveResearchFindingsResult;
}) {
  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50">
        {/* Header */}
        <div className="border-b border-emerald-200 bg-emerald-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-700" />
            <h3 className="font-semibold text-emerald-900">
              Research Findings Saved
            </h3>
          </div>
          <p className="mt-1 text-sm text-emerald-700">{result.topic}</p>
        </div>

        {/* Summary Stats */}
        <div className="border-b border-emerald-200 bg-white px-4 py-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {result.totalFindings}
              </div>
              <div className="text-xs text-gray-600">Total Findings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {result.sources.length}
              </div>
              <div className="text-xs text-gray-600">Unique Sources</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {result.categories.length}
              </div>
              <div className="text-xs text-gray-600">Categories</div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="border-b border-emerald-200 bg-white px-4 py-3">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            Categories
          </h4>
          <div className="flex flex-wrap gap-2">
            {result.categories.map((category, index) => (
              <span
                className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                key={`category-${index}-${category}`}
              >
                {category}
              </span>
            ))}
          </div>
        </div>

        {/* Findings List */}
        <div className="bg-white px-4 py-3">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Latest Findings
          </h4>
          <div className="space-y-3">
            {result.findings.slice(-5).map((finding, index) => (
              <div
                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                key={`finding-${index}-${finding.fact.substring(0, 20)}`}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{finding.fact}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {finding.category}
                      </span>
                      <a
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        href={finding.source}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Source
                      </a>
                    </div>
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
        <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-2">
          <p className="text-xs text-emerald-700">
            Saved at {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
