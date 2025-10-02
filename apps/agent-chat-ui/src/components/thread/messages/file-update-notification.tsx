"use client";

import { formatDistanceToNow } from "date-fns";
import { type Change, diffLines as diffLinesUtil } from "diff";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  FileText,
  GitBranch,
  User,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// TypeScript interfaces
export type Collaborator = {
  id: string;
  name: string;
  avatar?: string;
  isActive?: boolean;
  lastSeen?: Date;
};

export type FileUpdateNotificationProps = {
  fileName: string;
  editorName: string;
  timestamp: Date | string;
  oldContent?: string;
  newContent?: string;
  changeType: "created" | "modified" | "deleted";
  collaborators?: Collaborator[];
  branch?: string;
  isRealTime?: boolean;
  error?: string;
  success?: boolean;
  className?: string;
};

export type DiffLine = {
  type: "default" | "added" | "removed";
  value: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
};

// Helper functions
const LINE_BREAK_REGEX = /\n$/;

function constructLines(value: string): string[] {
  if (value === "") {
    return [];
  }
  const lines = value.replace(LINE_BREAK_REGEX, "").split("\n");
  return lines;
}

function computeDiffLines(oldContent: string, newContent: string): DiffLine[] {
  const changes: Change[] = diffLinesUtil(oldContent, newContent, {
    newlineIsToken: false,
  });

  let leftLineNumber = 0;
  let rightLineNumber = 0;
  const result: DiffLine[] = [];

  for (const change of changes) {
    const changeLines = constructLines(change.value);

    for (const line of changeLines) {
      if (change.added) {
        rightLineNumber += 1;
        result.push({
          type: "added",
          value: line,
          rightLineNumber,
        });
      } else if (change.removed) {
        leftLineNumber += 1;
        result.push({
          type: "removed",
          value: line,
          leftLineNumber,
        });
      } else {
        leftLineNumber += 1;
        rightLineNumber += 1;
        result.push({
          type: "default",
          value: line,
          leftLineNumber,
          rightLineNumber,
        });
      }
    }
  }

  return result;
}

function calculateDiffStats(diffLines: DiffLine[]) {
  let additions = 0;
  let deletions = 0;

  for (const line of diffLines) {
    if (line.type === "added") {
      additions += 1;
    } else if (line.type === "removed") {
      deletions += 1;
    }
  }

  return { additions, deletions };
}

const COLLAPSED_LINES = 8;
const MAX_ERROR_LENGTH = 150;

// Helper function to determine line marker
function getLineMarker(isAdded: boolean, isRemoved: boolean): string {
  if (isAdded) {
    return "+";
  }
  if (isRemoved) {
    return "-";
  }
  return " ";
}

// Helper function to render line content
function renderLineContent(line: DiffLine) {
  const { type, value } = line;
  const content = (
    <pre className="break-anywhere m-0 whitespace-pre-wrap px-2 py-0 text-[#24292e] leading-[1.6em]">
      {value || " "}
    </pre>
  );

  if (type === "added") {
    return <ins className="no-underline">{content}</ins>;
  }

  if (type === "removed") {
    return <del className="no-underline">{content}</del>;
  }

  return content;
}

// Main component
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <Fine>
export function FileUpdateNotification({
  fileName,
  editorName,
  timestamp,
  oldContent = "",
  newContent = "",
  changeType,
  collaborators = [],
  branch,
  isRealTime = false,
  error,
  success,
  className,
}: FileUpdateNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  // Format timestamp
  const formattedTime = useMemo(() => {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true });
  }, [timestamp]);

  // Compute diff if we have content
  const diffData = useMemo(() => {
    if (!(oldContent || newContent)) {
      return null;
    }

    const diffLines = computeDiffLines(oldContent, newContent);
    const { additions, deletions } = calculateDiffStats(diffLines);
    const totalLines = diffLines.length;
    const shouldShowExpand = totalLines > COLLAPSED_LINES;
    const displayedLines = isExpanded
      ? diffLines
      : diffLines.slice(0, COLLAPSED_LINES);

    return {
      diffLines,
      additions,
      deletions,
      totalLines,
      shouldShowExpand,
      displayedLines,
    };
  }, [oldContent, newContent, isExpanded]);

  // Determine status colors and icons
  const getStatusInfo = () => {
    if (error) {
      return {
        borderColor: "border-red-300",
        headerBg: "bg-red-50",
        headerBorder: "border-red-200",
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        textColor: "text-red-900",
        subTextColor: "text-red-700",
      };
    }

    if (success) {
      return {
        borderColor: "border-green-300",
        headerBg: "bg-green-50",
        headerBorder: "border-green-200",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        textColor: "text-green-900",
        subTextColor: "text-green-700",
      };
    }

    return {
      borderColor: "border-blue-300",
      headerBg: "bg-blue-50",
      headerBorder: "border-blue-200",
      icon: <FileText className="h-4 w-4 text-blue-500" />,
      textColor: "text-blue-900",
      subTextColor: "text-blue-700",
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      className={cn(
        "mx-auto grid max-w-4xl grid-rows-[1fr_auto] gap-3",
        className
      )}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "overflow-hidden rounded-lg border-2 bg-white shadow-xs",
          statusInfo.borderColor,
          isRealTime && "ring-2 ring-blue-100 ring-opacity-50"
        )}
        initial={{ opacity: 0, y: 10 }}
      >
        {/* Header */}
        <div
          className={cn(
            "border-b px-4 py-3",
            statusInfo.headerBorder,
            statusInfo.headerBg
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusInfo.icon}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <code
                    className={cn(
                      "truncate font-medium text-sm",
                      statusInfo.textColor
                    )}
                  >
                    {fileName}
                  </code>

                  {isRealTime && (
                    <motion.div
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1"
                      initial={{ scale: 0 }}
                    >
                      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                      <span className="text-green-600 text-xs">Live</span>
                    </motion.div>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600 text-xs">{editorName}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600 text-xs">
                      {formattedTime}
                    </span>
                  </div>

                  {branch && (
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-600 text-xs">{branch}</span>
                    </div>
                  )}

                  {collaborators.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-600 text-xs">
                        {collaborators.length}{" "}
                        {collaborators.length === 1
                          ? "collaborator"
                          : "collaborators"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {diffData && (
                <div className="mr-3 flex items-center gap-2">
                  {diffData.additions > 0 && (
                    <span className="font-medium text-green-600 text-sm">
                      +{diffData.additions}
                    </span>
                  )}
                  {diffData.deletions > 0 && (
                    <span className="font-medium text-red-600 text-sm">
                      -{diffData.deletions}
                    </span>
                  )}
                </div>
              )}

              <span
                className={cn(
                  "rounded px-2 py-1 font-medium text-xs",
                  changeType === "created" && "bg-green-100 text-green-700",
                  changeType === "modified" && "bg-blue-100 text-blue-700",
                  changeType === "deleted" && "bg-red-100 text-red-700"
                )}
              >
                {changeType.charAt(0).toUpperCase() + changeType.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-gray-200 border-b bg-gray-50 px-4 py-2">
          <div className="flex items-center gap-2">
            {diffData && (
              <motion.button
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  showDiff
                    ? "bg-blue-100 text-blue-700"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => setShowDiff(!showDiff)}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {showDiff ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showDiff ? "Hide Diff" : "Show Diff"}
              </motion.button>
            )}

            {collaborators.length > 0 && (
              <motion.button
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  showCollaborators
                    ? "bg-purple-100 text-purple-700"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => setShowCollaborators(!showCollaborators)}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Users className="h-4 w-4" />
                {showCollaborators ? "Hide" : "Show"} Collaborators
              </motion.button>
            )}
          </div>

          {error && (
            <span className="rounded bg-red-100 px-2 py-1 font-medium text-red-700 text-xs">
              Failed
            </span>
          )}

          {success && !error && (
            <span className="rounded bg-green-100 px-2 py-1 font-medium text-green-700 text-xs">
              Success
            </span>
          )}
        </div>

        {/* Collaborators Section */}
        <AnimatePresence>
          {showCollaborators && collaborators.length > 0 && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="border-gray-200 border-b bg-gray-50"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 py-3">
                <h4 className="mb-2 font-medium text-gray-900 text-sm">
                  Active Collaborators
                </h4>
                <div className="space-y-2">
                  {collaborators.map((collaborator) => (
                    <div
                      className="flex items-center gap-3"
                      key={collaborator.id}
                    >
                      <div className="relative">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        {collaborator.isActive && (
                          <div className="-bottom-0.5 -right-0.5 absolute h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {collaborator.name}
                        </p>
                        {collaborator.lastSeen && (
                          <p className="text-gray-500 text-xs">
                            Last seen{" "}
                            {formatDistanceToNow(collaborator.lastSeen, {
                              addSuffix: true,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Diff Section */}
        <AnimatePresence>
          {showDiff && diffData && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden bg-white"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse font-mono text-[13px]">
                  <tbody>
                    {diffData.displayedLines.map((line, index) => {
                      const isAdded = line.type === "added";
                      const isRemoved = line.type === "removed";

                      return (
                        <tr
                          className={cn("align-baseline", {
                            "bg-[#e6ffed]": isAdded,
                            "bg-[#ffeef0]": isRemoved,
                          })}
                          key={`${line.type}-${line.leftLineNumber || 0}-${line.rightLineNumber || 0}-${index}`}
                        >
                          {/* Left line number */}
                          <td
                            className={cn(
                              "select-none px-[10px] py-0 text-right",
                              "w-[50px] min-w-[50px] bg-[#f7f7f7]",
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
                              "w-[50px] min-w-[50px] bg-[#f7f7f7]",
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
                              "w-[28px] select-none px-[10px] py-0",
                              {
                                "bg-[#cdffd8] text-[#24292e]": isAdded,
                                "bg-[#ffdce0] text-[#24292e]": isRemoved,
                                "bg-[#f7f7f7]": !(isAdded || isRemoved),
                              }
                            )}
                          >
                            <pre className="m-0 p-0">
                              {getLineMarker(isAdded, isRemoved)}
                            </pre>
                          </td>

                          {/* Content */}
                          <td
                            className={cn("px-0 py-0", {
                              "bg-[#e6ffed]": isAdded,
                              "bg-[#ffeef0]": isRemoved,
                            })}
                          >
                            {renderLineContent(line)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Expand/Collapse Button */}
              {diffData.shouldShowExpand && (
                <motion.button
                  className="flex w-full cursor-pointer items-center justify-center border-gray-200 border-t bg-gray-50 py-2 text-gray-500 transition-all duration-200 ease-in-out hover:bg-gray-100 hover:text-gray-600"
                  initial={{ scale: 1 }}
                  onClick={() => setIsExpanded(!isExpanded)}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="mr-2 text-sm">
                    {isExpanded
                      ? "Show less"
                      : `Show all ${diffData.totalLines} lines (${diffData.totalLines - COLLAPSED_LINES} more)`}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Section */}
        {error && (
          <div className="border-red-200 border-t-2 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="mb-1 font-medium text-red-900 text-sm">
                  Update Failed
                </p>
                <p className="text-red-800 text-sm">
                  {error.length > MAX_ERROR_LENGTH
                    ? `${error.slice(0, MAX_ERROR_LENGTH)}...`
                    : error}
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
