"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  User, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff,
  Users,
  GitBranch,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { diffLines as diffLinesUtil, Change } from "diff";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// TypeScript interfaces
export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  isActive?: boolean;
  lastSeen?: Date;
}

export interface FileUpdateNotificationProps {
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
}

export interface DiffLine {
  type: "default" | "added" | "removed";
  value: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
}

// Helper functions
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
    });
  });

  return result;
}

function calculateDiffStats(diffLines: DiffLine[]) {
  let additions = 0;
  let deletions = 0;

  diffLines.forEach((line) => {
    if (line.type === "added") {
      additions += 1;
    } else if (line.type === "removed") {
      deletions += 1;
    }
  });

  return { additions, deletions };
}

const COLLAPSED_LINES = 8;

// Main component
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
  className
}: FileUpdateNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  // Format timestamp
  const formattedTime = useMemo(() => {
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true });
  }, [timestamp]);

  // Compute diff if we have content
  const diffData = useMemo(() => {
    if (!oldContent && !newContent) return null;
    
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
      displayedLines
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
        subTextColor: "text-red-700"
      };
    }

    if (success) {
      return {
        borderColor: "border-green-300",
        headerBg: "bg-green-50",
        headerBorder: "border-green-200",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        textColor: "text-green-900",
        subTextColor: "text-green-700"
      };
    }

    return {
      borderColor: "border-blue-300",
      headerBg: "bg-blue-50",
      headerBorder: "border-blue-200",
      icon: <FileText className="h-4 w-4 text-blue-500" />,
      textColor: "text-blue-900",
      subTextColor: "text-blue-700"
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={cn("mx-auto grid max-w-4xl grid-rows-[1fr_auto] gap-3", className)}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "overflow-hidden rounded-lg border-2 bg-white shadow-sm",
          statusInfo.borderColor,
          isRealTime && "ring-2 ring-blue-100 ring-opacity-50"
        )}
      >
        {/* Header */}
        <div className={cn(
          "border-b px-4 py-3",
          statusInfo.headerBorder,
          statusInfo.headerBg
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusInfo.icon}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className={cn(
                    "text-sm font-medium truncate",
                    statusInfo.textColor
                  )}>
                    {fileName}
                  </code>
                  
                  {isRealTime && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-green-600">Live</span>
                    </motion.div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-600">{editorName}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-600">{formattedTime}</span>
                  </div>
                  
                  {branch && (
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">{branch}</span>
                    </div>
                  )}
                  
                  {collaborators.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        {collaborators.length} {collaborators.length === 1 ? 'collaborator' : 'collaborators'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {diffData && (
                <div className="flex items-center gap-2 mr-3">
                  {diffData.additions > 0 && (
                    <span className="text-sm font-medium text-green-600">
                      +{diffData.additions}
                    </span>
                  )}
                  {diffData.deletions > 0 && (
                    <span className="text-sm font-medium text-red-600">
                      -{diffData.deletions}
                    </span>
                  )}
                </div>
              )}
              
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded",
                changeType === "created" && "bg-green-100 text-green-700",
                changeType === "modified" && "bg-blue-100 text-blue-700",
                changeType === "deleted" && "bg-red-100 text-red-700"
              )}>
                {changeType.charAt(0).toUpperCase() + changeType.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {diffData && (
              <motion.button
                onClick={() => setShowDiff(!showDiff)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                  showDiff 
                    ? "bg-blue-100 text-blue-700" 
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {showDiff ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDiff ? "Hide Diff" : "Show Diff"}
              </motion.button>
            )}
            
            {collaborators.length > 0 && (
              <motion.button
                onClick={() => setShowCollaborators(!showCollaborators)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                  showCollaborators 
                    ? "bg-purple-100 text-purple-700" 
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Users className="h-4 w-4" />
                {showCollaborators ? "Hide" : "Show"} Collaborators
              </motion.button>
            )}
          </div>
          
          {error && (
            <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
              Failed
            </span>
          )}
          
          {success && !error && (
            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
              Success
            </span>
          )}
        </div>

        {/* Collaborators Section */}
        <AnimatePresence>
          {showCollaborators && collaborators.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-b border-gray-200 bg-gray-50"
            >
              <div className="px-4 py-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Active Collaborators</h4>
                <div className="space-y-2">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        {collaborator.isActive && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{collaborator.name}</p>
                        {collaborator.lastSeen && (
                          <p className="text-xs text-gray-500">
                            Last seen {formatDistanceToNow(collaborator.lastSeen, { addSuffix: true })}
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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden bg-white"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse font-mono text-[13px]">
                  <tbody>
                    {diffData.displayedLines.map((line, index) => {
                      const isAdded = line.type === "added";
                      const isRemoved = line.type === "removed";

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
              {diffData.shouldShowExpand && (
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
          <div className="border-t-2 border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-1">
                  Update Failed
                </p>
                <p className="text-sm text-red-800">
                  {error.length > 150 ? error.slice(0, 150) + "..." : error}
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}