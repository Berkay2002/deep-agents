"use client";

import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink, Search } from "lucide-react";
import { useState } from "react";

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
    <div className="border-gray-200 border-b last:border-b-0">
      <div className="p-4 transition-colors hover:bg-gray-50">
        {/* Header with title and URL */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <a
            className="group flex-1"
            href={result.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <h4 className="line-clamp-2 font-medium text-blue-600 text-sm group-hover:text-blue-800 group-hover:underline">
              {result.title}
            </h4>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-gray-500 text-xs">{domain}</span>
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </div>
          </a>
        </div>

        {/* Content snippet */}
        <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
          {displayContent}
        </p>

        {/* Expand button */}
        {hasExpandableContent && (
          <button
            className="mt-2 flex items-center gap-1 text-gray-500 text-xs hover:text-gray-700"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
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
        <div className="border-gray-200 border-b bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium text-gray-900 text-sm">
                  {query}
                </h3>
                <p className="text-gray-500 text-xs">
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
              className="flex-shrink-0 text-gray-500 hover:text-gray-700"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <motion.div
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          className="overflow-hidden"
          initial={false}
          transition={{ duration: 0.2 }}
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
