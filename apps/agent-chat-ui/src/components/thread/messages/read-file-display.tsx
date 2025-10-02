"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Book, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadFileDisplayProps {
  toolName: string;
  args: {
    file_path?: string;
    filePath?: string;
    startLine?: number;
    start_line?: number;
    endLine?: number;
    end_line?: number;
  };
  content: string;
}

const PREVIEW_LINES = 3;
const EXPANDED_LINES = 15;

export function ReadFileDisplay({ toolName, args, content }: ReadFileDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Start with preview

  const filePath = args.file_path || args.filePath || "unknown";
  const startLine = args.startLine || args.start_line;
  const endLine = args.endLine || args.end_line;
  
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
          className="border-b border-blue-200 bg-blue-50 px-4 py-2 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book className="h-4 w-4 text-blue-500" />
              <code className="text-sm font-medium text-blue-900">
                {filePath}
              </code>
              <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                <Eye className="inline h-3 w-3 mr-1" />
                Read
              </span>
            </div>
            <div className="flex items-center gap-3">
              {startLine && endLine && (
                <span className="text-xs text-blue-600 font-medium">
                  Lines {startLine}-{endLine}
                </span>
              )}
              <span className="text-xs text-blue-500">
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
                      key={index}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      {/* Line number */}
                      <td
                        className={cn(
                          "select-none px-[10px] py-0 text-right",
                          "min-w-[50px] w-[50px] bg-[#f7f7f7] border-r border-blue-100"
                        )}
                      >
                        <pre className="m-0 p-0 text-[#212529] opacity-50 hover:opacity-100">
                          {lineNumber}
                        </pre>
                      </td>

                      {/* Content */}
                      <td className="px-2 py-0 bg-white">
                        <pre className="m-0 px-2 py-0 text-[#24292e] whitespace-pre-wrap break-anywhere leading-[1.6em]">
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
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex w-full cursor-pointer items-center justify-center border-t border-blue-200 bg-blue-50 py-2 text-blue-500 transition-all duration-200 ease-in-out hover:bg-blue-100 hover:text-blue-600"
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="mr-2 text-sm">
                {isExpanded
                  ? (canShowAll ? "Show all" : "Show less")
                  : `Show more (${totalLines - PREVIEW_LINES} more lines)`}
              </span>
              {isExpanded ? (
                canShowAll ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
