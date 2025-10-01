"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Search, ExternalLink } from "lucide-react";

interface TavilySearchResult {
  url: string;
  title: string;
  content: string;
  score?: number;
  raw_content?: string | null;
}

interface TavilySearchResultsProps {
  query: string;
  results: TavilySearchResult[];
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

function TavilySearchResultCard({ result }: { result: TavilySearchResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const domain = extractDomain(result.url);
  const hasExpandableContent = result.content.length > 200;
  const displayContent =
    !isExpanded && hasExpandableContent
      ? result.content.slice(0, 200) + "..."
      : result.content;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <div className="p-4 hover:bg-gray-50 transition-colors">
        {/* Header with title and URL */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex-1"
          >
            <h4 className="text-sm font-medium text-blue-600 group-hover:text-blue-800 group-hover:underline line-clamp-2">
              {result.title}
            </h4>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-500">{domain}</span>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </div>
          </a>
        </div>

        {/* Content snippet */}
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </p>

        {/* Expand button */}
        {hasExpandableContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
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

export function TavilySearchResults({
  query,
  results,
  responseTime,
}: TavilySearchResultsProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  const validResults = results.filter((r) => r.url && r.title && r.content);

  if (validResults.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm truncate">
                  {query}
                </h3>
                <p className="text-xs text-gray-500">
                  {validResults.length} result
                  {validResults.length !== 1 ? "s" : ""}
                  {responseTime && (
                    <span className="text-gray-400">
                      {" "}
                      · {responseTime.toFixed(2)}s
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
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
              <TavilySearchResultCard key={idx} result={result} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
