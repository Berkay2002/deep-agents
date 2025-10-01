"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Search, ExternalLink, Sparkles, FileText } from "lucide-react";

interface ExaHighlight {
  snippet?: string | null;
  source?: string | null;
}

interface ExaSearchResult {
  url: string;
  title?: string | null;
  summary?: string | null;
  snippet?: string | null;
  fullText?: string | null;
  author?: string | null;
  publishedDate?: string | null;
  highlights?: ExaHighlight[];
}

interface ExaSearchResultsProps {
  query: string;
  results: ExaSearchResult[];
  responseTime?: number;
}

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch {
    return url;
  }
}

function ExaSearchResultCard({ result }: { result: ExaSearchResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const domain = extractDomain(result.url);

  // Determine what content to show
  const mainContent = result.summary || result.snippet || result.fullText?.slice(0, 500);
  const hasExpandableContent = (result.fullText && result.fullText.length > 500) ||
                                (result.snippet && result.snippet.length > 300);
  const hasHighlights = result.highlights && result.highlights.length > 0;

  return (
    <div className="border-b border-indigo-100 last:border-b-0">
      <div className="p-4 hover:bg-indigo-50/30 transition-colors">
        {/* Header with title and URL */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex-1"
          >
            <h4 className="text-sm font-medium text-indigo-700 group-hover:text-indigo-900 group-hover:underline line-clamp-2">
              {result.title || "Untitled"}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-500">{domain}</span>
              {result.author && (
                <span className="text-xs text-gray-500">• by {result.author}</span>
              )}
              {result.publishedDate && (
                <span className="text-xs text-gray-500">• {new Date(result.publishedDate).toLocaleDateString()}</span>
              )}
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </div>
          </a>
        </div>

        {/* Summary or snippet */}
        {mainContent && (
          <div className="mb-2">
            {result.summary && (
              <div className="flex items-start gap-2 mb-2">
                <Sparkles className="w-3 h-3 text-indigo-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap italic">
                  {isExpanded ? mainContent : mainContent.slice(0, 200) + (mainContent.length > 200 ? "..." : "")}
                </p>
              </div>
            )}
            {!result.summary && result.snippet && (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {isExpanded ? result.snippet : result.snippet.slice(0, 200) + (result.snippet.length > 200 ? "..." : "")}
              </p>
            )}
          </div>
        )}

        {/* Neural search highlights */}
        {hasHighlights && showHighlights && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-indigo-600" />
              <span className="text-xs font-medium text-indigo-700">Neural Search Highlights</span>
            </div>
            <div className="space-y-1.5 pl-4">
              {result.highlights!.slice(0, isExpanded ? undefined : 2).map((highlight, idx) => (
                <div key={idx} className="text-xs text-gray-600 leading-relaxed border-l-2 border-indigo-200 pl-2">
                  {highlight.snippet}
                </div>
              ))}
              {!isExpanded && result.highlights!.length > 2 && (
                <p className="text-xs text-indigo-600 italic pl-2">
                  +{result.highlights!.length - 2} more highlights
                </p>
              )}
            </div>
          </div>
        )}

        {/* Expand button */}
        {(hasExpandableContent || (hasHighlights && result.highlights!.length > 2)) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function ExaSearchResults({
  query,
  results,
  responseTime,
}: ExaSearchResultsProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  const validResults = results.filter((r) => r.url);

  if (validResults.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-indigo-200 bg-white">
        {/* Header */}
        <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm truncate">
                  {query}
                </h3>
                <p className="text-xs text-indigo-700">
                  {validResults.length} neural search result
                  {validResults.length !== 1 ? "s" : ""}
                  {responseTime && (
                    <span className="text-indigo-600">
                      {" "}
                      · {responseTime.toFixed(2)}s
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-indigo-600 hover:text-indigo-800 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="max-h-[500px] overflow-y-auto">
            {validResults.map((result, idx) => (
              <ExaSearchResultCard key={idx} result={result} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
