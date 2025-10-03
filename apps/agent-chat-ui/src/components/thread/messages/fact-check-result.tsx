import { CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";

type FactCheckSource = {
  title: string;
  url: string;
  snippet: string;
};

type FactCheckResult = {
  claim: string;
  context?: string;
  verified: boolean;
  sources: FactCheckSource[];
  synthesizedAnswer?: string | null;
  confidence: "high" | "medium" | "low";
  notes: string;
  timestamp: string;
};

export function FactCheckResult({ result }: { result: FactCheckResult }) {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "text-green-600 bg-green-100 border-green-200";
      case "medium":
        return "text-yellow-600 bg-yellow-100 border-yellow-200";
      case "low":
        return "text-red-600 bg-red-100 border-red-200";
      default:
        return "text-gray-600 bg-gray-100 border-gray-200";
    }
  };

  const getVerifiedIcon = () => {
    if (result.verified) {
      return <CheckCircle2 className="h-6 w-6 text-green-600" />;
    }
    return <XCircle className="h-6 w-6 text-red-600" />;
  };

  const getVerifiedColor = () => {
    if (result.verified) {
      return "border-green-200 bg-green-50";
    }
    return "border-red-200 bg-red-50";
  };

  const getHeaderColor = () => {
    if (result.verified) {
      return "border-green-200 bg-green-100";
    }
    return "border-red-200 bg-red-100";
  };

  const getHeaderTextColor = () => {
    if (result.verified) {
      return "text-green-900";
    }
    return "text-red-900";
  };

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className={`overflow-hidden rounded-lg border ${getVerifiedColor()}`}>
        {/* Header */}
        <div className={`border-b px-4 py-3 ${getHeaderColor()}`}>
          <div className="flex items-center gap-2">
            {getVerifiedIcon()}
            <h3 className={`font-semibold ${getHeaderTextColor()}`}>
              Fact Check Result
            </h3>
          </div>
        </div>

        {/* Claim */}
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <h4 className="mb-1 text-sm font-semibold text-gray-700">Claim</h4>
          <p className="text-sm text-gray-900">{result.claim}</p>
          {result.context && (
            <p className="mt-2 text-xs text-gray-600 italic">
              Context: {result.context}
            </p>
          )}
        </div>

        {/* Verification Status */}
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-1 text-xs font-semibold text-gray-700">
                Status
              </h4>
              <div className="flex items-center gap-2">
                {result.verified ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                    ✗ Not Verified
                  </span>
                )}
              </div>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold text-gray-700">
                Confidence
              </h4>
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-4 w-4 ${result.confidence === "low" ? "text-red-500" : result.confidence === "medium" ? "text-yellow-500" : "text-green-500"}`}
                />
                <span
                  className={`rounded-full border px-3 py-1 text-sm font-medium ${getConfidenceColor(result.confidence)}`}
                >
                  {result.confidence.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Synthesized Answer */}
        {result.synthesizedAnswer && (
          <div className="border-b border-gray-200 bg-blue-50 px-4 py-3">
            <h4 className="mb-2 text-sm font-semibold text-blue-900">
              Synthesized Answer
            </h4>
            <p className="text-sm text-blue-800">{result.synthesizedAnswer}</p>
          </div>
        )}

        {/* Notes */}
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">Notes</h4>
          <p className="text-sm text-gray-700">{result.notes}</p>
        </div>

        {/* Sources */}
        <div className="bg-white px-4 py-3">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Sources ({result.sources.length})
          </h4>
          <div className="space-y-3">
            {result.sources.map((source, index) => (
              <div
                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                key={`source-${index}-${source.url}`}
              >
                <a
                  className="flex items-start gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  href={source.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{source.title}</span>
                </a>
                {source.snippet && (
                  <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                    {source.snippet}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Timestamp */}
        <div className={`border-t px-4 py-2 ${getVerifiedColor()}`}>
          <p className="text-xs text-gray-600">
            Checked at {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
