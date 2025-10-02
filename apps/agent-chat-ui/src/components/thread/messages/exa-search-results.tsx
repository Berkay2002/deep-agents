"use client";

import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

type ExaHighlight = {
  snippet?: string | null;
  source?: string | null;
};

type ExaSearchResult = {
  url: string;
  title?: string | null;
  summary?: string | null;
  snippet?: string | null;
  fullText?: string | null;
  author?: string | null;
  publishedDate?: string | null;
  highlights?: ExaHighlight[];
};

type ExaSearchResultsProps = {
  query: string;
  results: ExaSearchResult[];
  responseTime?: number;
};

const HIGHLIGHT_SNIPPET_LENGTH = 20;
const CONTENT_PREVIEW_LENGTH = 500;
const FULL_TEXT_THRESHOLD = 500;
const SNIPPET_THRESHOLD = 300;
const PREVIEW_TRUNCATE_LENGTH = 200;

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch {
    return url;
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <It's fine>
function ExaSearchResultCard({ result }: { result: ExaSearchResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const domain = extractDomain(result.url);

  // Determine what content to show
  const mainContent =
    result.summary ||
    result.snippet ||
    result.fullText?.slice(0, CONTENT_PREVIEW_LENGTH);
  const hasExpandableContent =
    (result.fullText && result.fullText.length > FULL_TEXT_THRESHOLD) ||
    (result.snippet && result.snippet.length > SNIPPET_THRESHOLD);
  const hasHighlights = result.highlights && result.highlights.length > 0;

  return (
    <div className="border-indigo-100 border-b last:border-b-0">
      <div className="p-4 transition-colors hover:bg-indigo-50/30">
        {/* Header with title and URL */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <a
            className="group flex-1"
            href={result.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <h4 className="line-clamp-2 font-medium text-indigo-700 text-sm group-hover:text-indigo-900 group-hover:underline">
              {result.title || "Untitled"}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-gray-500 text-xs">{domain}</span>
              {result.author && (
                <span className="text-gray-500 text-xs">
                  • by {result.author}
                </span>
              )}
              {result.publishedDate && (
                <span className="text-gray-500 text-xs">
                  • {new Date(result.publishedDate).toLocaleDateString()}
                </span>
              )}
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </div>
          </a>
        </div>

        {/* Summary or snippet */}
        {mainContent && (
          <div className="mb-2">
            {result.summary && (
              <div className="mb-2 flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" />
                <p className="whitespace-pre-wrap text-gray-700 text-sm italic leading-relaxed">
                  {isExpanded
                    ? mainContent
                    : mainContent.slice(0, PREVIEW_TRUNCATE_LENGTH) +
                      (mainContent.length > PREVIEW_TRUNCATE_LENGTH
                        ? "..."
                        : "")}
                </p>
              </div>
            )}
            {!result.summary && result.snippet && (
              <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                {isExpanded
                  ? result.snippet
                  : result.snippet.slice(0, PREVIEW_TRUNCATE_LENGTH) +
                    (result.snippet.length > PREVIEW_TRUNCATE_LENGTH
                      ? "..."
                      : "")}
              </p>
            )}
          </div>
        )}

        {/* Neural search highlights */}
        {hasHighlights && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-indigo-600" />
              <span className="font-medium text-indigo-700 text-xs">
                Neural Search Highlights
              </span>
            </div>
            <div className="space-y-1.5 pl-4">
              {result.highlights
                ?.slice(0, isExpanded ? undefined : 2)
                .map((highlight, idx) => (
                  <div
                    className="border-indigo-200 border-l-2 pl-2 text-gray-600 text-xs leading-relaxed"
                    key={`highlight-${highlight.snippet?.slice(0, HIGHLIGHT_SNIPPET_LENGTH)}-${idx}`}
                  >
                    {highlight.snippet}
                  </div>
                ))}
              {!isExpanded && (result.highlights?.length ?? 0) > 2 && (
                <p className="pl-2 text-indigo-600 text-xs italic">
                  +{(result.highlights?.length ?? 0) - 2} more highlights
                </p>
              )}
            </div>
          </div>
        )}

        {/* Expand button */}
        {(hasExpandableContent ||
          (hasHighlights && (result.highlights?.length ?? 0) > 2)) && (
          <button
            className="mt-2 flex items-center gap-1 font-medium text-indigo-600 text-xs hover:text-indigo-800"
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }
            }}
            type="button"
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
        <div className="border-indigo-200 border-b bg-indigo-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-indigo-600" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium text-gray-900 text-sm">
                  {query}
                </h3>
                <p className="text-indigo-700 text-xs">
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
              className="shrink-0 text-indigo-600 hover:text-indigo-800"
              onClick={() => setIsExpanded(!isExpanded)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }
              }}
              type="button"
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
              <ExaSearchResultCard
                key={`${result.url}-${idx}`}
                result={result}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
