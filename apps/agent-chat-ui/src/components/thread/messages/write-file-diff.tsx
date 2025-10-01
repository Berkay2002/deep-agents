"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { diffLines as diffLinesUtil, Change } from "diff";
import { cn } from "@/lib/utils";

interface WriteFileDiffProps {
  toolName: string;
  args: {
    file_path?: string;
    old_string?: string;
    new_string?: string;
    content?: string;
  };
}

enum DiffType {
  DEFAULT = 0,
  ADDED = 1,
  REMOVED = 2,
}

interface DiffLine {
  type: DiffType;
  value: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
}

const COLLAPSED_LINES = 10;

function constructLines(value: string): string[] {
  if (value === "") return [];
  const lines = value.replace(/\n$/, "").split("\n");
  return lines;
}

function computeDiffLines(oldContent: string, newContent: string): DiffLine[] {
  const changes: Change[] = diffLinesUtil(oldContent, newContent, {
    newlineIsToken: false,
  });

  let leftLineNumber = 0;
  let rightLineNumber = 0;
  const result: DiffLine[] = [];

  changes.forEach((change) => {
    const changeLines = constructLines(change.value);

    changeLines.forEach((line) => {
      if (change.added) {
        rightLineNumber += 1;
        result.push({
          type: DiffType.ADDED,
          value: line,
          rightLineNumber,
        });
      } else if (change.removed) {
        leftLineNumber += 1;
        result.push({
          type: DiffType.REMOVED,
          value: line,
          leftLineNumber,
        });
      } else {
        leftLineNumber += 1;
        rightLineNumber += 1;
        result.push({
          type: DiffType.DEFAULT,
          value: line,
          leftLineNumber,
          rightLineNumber,
        });
      }
    });
  });

  return result;
}

function calculateStats(diffLines: DiffLine[]) {
  let additions = 0;
  let deletions = 0;

  diffLines.forEach((line) => {
    if (line.type === DiffType.ADDED) {
      additions += 1;
    } else if (line.type === DiffType.REMOVED) {
      deletions += 1;
    }
  });

  return { additions, deletions };
}

export function WriteFileDiff({ toolName, args }: WriteFileDiffProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const filePath = args.file_path || "unknown";
  const isWriteOperation = toolName === "Write" || toolName === "write_file";
  
  // Note: This component intentionally does not render copy content or refresh buttons
  // to keep the diff view clean and focused on the content changes

  // Determine old and new content
  let oldContent = "";
  let newContent = "";

  if (isWriteOperation) {
    // For Write operations, show the entire content as new
    oldContent = "";
    newContent = args.content || "";
  } else {
    // For Edit operations
    oldContent = args.old_string || "";
    newContent = args.new_string || "";
  }

  // Handle empty content case
  if (!oldContent && !newContent) {
    return null;
  }

  // Compute diff lines
  const diffLines = computeDiffLines(oldContent, newContent);
  const { additions, deletions } = calculateStats(diffLines);

  // Determine which lines to show
  const totalLines = diffLines.length;
  const shouldShowExpand = totalLines > COLLAPSED_LINES;
  const displayedLines = isExpanded
    ? diffLines
    : diffLines.slice(0, COLLAPSED_LINES);

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <code className="text-sm font-medium text-gray-900">
                {filePath}
              </code>
            </div>
            <div className="flex items-center gap-3">
              {additions > 0 && (
                <span className="text-sm font-medium text-green-600">
                  +{additions}
                </span>
              )}
              {deletions > 0 && (
                <span className="text-sm font-medium text-red-600">
                  -{deletions}
                </span>
              )}
              <span className="text-xs text-gray-500">
                {isWriteOperation ? "Created" : "Modified"}
              </span>
            </div>
          </div>
        </div>

        {/* Diff Content */}
        <div className="overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse font-mono text-[13px]">
              <tbody>
                {displayedLines.map((line, index) => {
                  const isAdded = line.type === DiffType.ADDED;
                  const isRemoved = line.type === DiffType.REMOVED;

                  return (
                    <tr
                      key={index}
                      className={cn("align-baseline", {
                        "bg-[#e6ffed]": isAdded,
                        "bg-[#ffeef0]": isRemoved,
                      })}
                    >
                      {/* Left line number */}
                      <td
                        className={cn(
                          "select-none px-[10px] py-0 text-right",
                          "min-w-[50px] w-[50px] bg-[#f7f7f7]",
                          {
                            "bg-[#cdffd8]": isAdded,
                            "bg-[#ffdce0]": isRemoved,
                          }
                        )}
                      >
                        <pre className="m-0 p-0 text-[#212529] opacity-50 hover:opacity-100">
                          {line.leftLineNumber || ""}
                        </pre>
                      </td>

                      {/* Right line number */}
                      <td
                        className={cn(
                          "select-none px-[10px] py-0 text-right",
                          "min-w-[50px] w-[50px] bg-[#f7f7f7]",
                          {
                            "bg-[#cdffd8]": isAdded,
                            "bg-[#ffdce0]": isRemoved,
                          }
                        )}
                      >
                        <pre className="m-0 p-0 text-[#212529] opacity-50 hover:opacity-100">
                          {line.rightLineNumber || ""}
                        </pre>
                      </td>

                      {/* Marker (+/-) */}
                      <td
                        className={cn(
                          "w-[28px] px-[10px] py-0 select-none",
                          {
                            "bg-[#cdffd8] text-[#24292e]": isAdded,
                            "bg-[#ffdce0] text-[#24292e]": isRemoved,
                            "bg-[#f7f7f7]": !isAdded && !isRemoved,
                          }
                        )}
                      >
                        <pre className="m-0 p-0">
                          {isAdded ? "+" : isRemoved ? "-" : " "}
                        </pre>
                      </td>

                      {/* Content */}
                      <td
                        className={cn("px-0 py-0", {
                          "bg-[#e6ffed]": isAdded,
                          "bg-[#ffeef0]": isRemoved,
                        })}
                      >
                        {isAdded ? (
                          <ins className="no-underline">
                            <pre className="m-0 px-2 py-0 text-[#24292e] whitespace-pre-wrap break-anywhere leading-[1.6em]">
                              {line.value || " "}
                            </pre>
                          </ins>
                        ) : isRemoved ? (
                          <del className="no-underline">
                            <pre className="m-0 px-2 py-0 text-[#24292e] whitespace-pre-wrap break-anywhere leading-[1.6em]">
                              {line.value || " "}
                            </pre>
                          </del>
                        ) : (
                          <pre className="m-0 px-2 py-0 text-[#24292e] whitespace-pre-wrap break-anywhere leading-[1.6em]">
                            {line.value || " "}
                          </pre>
                        )}
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
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex w-full cursor-pointer items-center justify-center border-t border-gray-200 bg-gray-50 py-2 text-gray-500 transition-all duration-200 ease-in-out hover:bg-gray-100 hover:text-gray-600"
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="mr-2 text-sm">
                {isExpanded
                  ? "Show less"
                  : `Show all ${totalLines} lines (${totalLines - COLLAPSED_LINES} more)`}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
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
