"use client";

import { motion } from "framer-motion";
import { Book, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ReadFileDisplayProps = {
  toolName: string;
  args: {
    filePath?: string;
    startLine?: number;
    endLine?: number;
  };
  content: string;
};

const PREVIEW_LINES = 3;
const EXPANDED_LINES = 15;

// Helper function to determine button text
const getButtonText = (
  isExpanded: boolean,
  canShowAll: boolean,
  totalLines: number,
  previewLines: number
): string => {
  if (!isExpanded) {
    return `Show more (${totalLines - previewLines} more lines)`;
  }
  
  return canShowAll ? "Show all" : "Show less";
};

// Helper function to determine button icon
const getButtonIcon = (
  isExpanded: boolean,
  canShowAll: boolean
): React.ReactElement => {
  if (!isExpanded) {
    return <ChevronDown className="h-4 w-4" />;
  }
  
  return canShowAll ? (
    <ChevronDown className="h-4 w-4" />
  ) : (
    <ChevronUp className="h-4 w-4" />
  );
};

export function ReadFileDisplay({
  args,
  content,
}: ReadFileDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Start with preview

  const filePath = args.filePath || "unknown";
  const startLine = args.startLine;
  const endLine = args.endLine;

  // Parse content into lines
  const contentLines = content.split("\n");
  const totalLines = contentLines.length;
  const shouldShowExpand = totalLines > PREVIEW_LINES;

  // Show preview (3 lines) when collapsed, or limited lines when expanded
  const displayedLines = isExpanded
    ? contentLines.slice(0, EXPANDED_LINES)
    : contentLines.slice(0, PREVIEW_LINES);

  const hasMoreToShow = totalLines > EXPANDED_LINES;
  const canShowAll = isExpanded && hasMoreToShow;

  // Determine line number offset
  const lineNumberOffset = startLine ? startLine - 1 : 0;

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border-2 border-blue-200 bg-white">
        {/* Header - Always visible, clickable to expand/collapse */}
        <motion.div
          className="cursor-pointer border-blue-200 border-b bg-blue-50 px-4 py-2 transition-colors hover:bg-blue-100"
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book className="h-4 w-4 text-blue-500" />
              <code className="font-medium text-blue-900 text-sm">
                {filePath}
              </code>
              <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-700 text-xs">
                <Eye className="mr-1 inline h-3 w-3" />
                Read
              </span>
            </div>
            <div className="flex items-center gap-3">
              {startLine && endLine && (
                <span className="font-medium text-blue-600 text-xs">
                  Lines {startLine}-{endLine}
                </span>
              )}
              <span className="text-blue-500 text-xs">
                {totalLines} {totalLines === 1 ? "line" : "lines"}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-blue-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-blue-500" />
              )}
            </div>
          </div>
        </motion.div>

        {/* File Content - Always visible (preview or expanded) */}
        <div className="overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse font-mono text-[13px]">
              <tbody>
                {displayedLines.map((line, index) => {
                  const lineNumber = lineNumberOffset + index + 1;

                  return (
                    <tr
                      className="transition-colors hover:bg-blue-50"
                      key={`line-${lineNumber}`}
                    >
                      {/* Line number */}
                      <td
                        className={cn(
                          "select-none px-[10px] py-0 text-right",
                          "w-[50px] min-w-[50px] border-blue-100 border-r bg-[#f7f7f7]"
                        )}
                      >
                        <pre className="m-0 p-0 text-[#212529] opacity-50 hover:opacity-100">
                          {lineNumber}
                        </pre>
                      </td>

                      {/* Content */}
                      <td className="bg-white px-2 py-0">
                        <pre className="break-anywhere m-0 whitespace-pre-wrap px-2 py-0 text-[#24292e] leading-[1.6em]">
                          {line || " "}
                        </pre>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expand/Collapse Button */}
          {shouldShowExpand && (
            <motion.button
              type="button"
              className="flex w-full cursor-pointer items-center justify-center border-blue-200 border-t bg-blue-50 py-2 text-blue-500 transition-all duration-200 ease-in-out hover:bg-blue-100 hover:text-blue-600"
              initial={{ scale: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="mr-2 text-sm">
                {getButtonText(isExpanded, canShowAll, totalLines, PREVIEW_LINES)}
              </span>
              {getButtonIcon(isExpanded, canShowAll)}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}