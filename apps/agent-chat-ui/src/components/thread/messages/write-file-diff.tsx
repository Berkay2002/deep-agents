"use client";

import { type Change, diffLines as diffLinesUtil } from "diff";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type WriteFileDiffProps = {
  toolName: string;
  args: {
    filePath?: string;
    file_path?: string;
    oldString?: string;
    old_string?: string;
    newString?: string;
    new_string?: string;
    content?: string;
  };
  error?: string; // Error message if the operation failed
  success?: boolean; // Whether the operation succeeded
};

const DiffType = {
  default: 0,
  added: 1,
  removed: 2,
} as const;

type DiffType = typeof DiffType[keyof typeof DiffType];

type DiffLine = {
  type: DiffType;
  value: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
};

const COLLAPSED_LINES = 10;
const ERROR_PREVIEW_LENGTH = 150;

const LINE_SPLIT_REGEX = /\n$/;

function constructLines(value: string): string[] {
  if (value === "") {
    return [];
  }
  const lines = value.replace(LINE_SPLIT_REGEX, "").split("\n");
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
          type: DiffType.added,
          value: line,
          rightLineNumber,
        });
      } else if (change.removed) {
        leftLineNumber += 1;
        result.push({
          type: DiffType.removed,
          value: line,
          leftLineNumber,
        });
      } else {
        leftLineNumber += 1;
        rightLineNumber += 1;
        result.push({
          type: DiffType.default,
          value: line,
          leftLineNumber,
          rightLineNumber,
        });
      }
    }
  }

  return result;
}

function calculateStats(diffLines: DiffLine[]) {
  let additions = 0;
  let deletions = 0;

  for (const line of diffLines) {
    if (line.type === DiffType.added) {
      additions += 1;
    } else if (line.type === DiffType.removed) {
      deletions += 1;
    }
  }

  return { additions, deletions };
}

function getFileContent(args: WriteFileDiffProps["args"], isWriteOperation: boolean) {
  if (isWriteOperation) {
    // For Write operations, show the entire content as new
    return {
      oldContent: "",
      newContent: args.content || "",
    };
  }
  
  // For Edit operations
  return {
    oldContent: args.oldString || args.old_string || "",
    newContent: args.newString || args.new_string || "",
  };
}

function StatusIcon({ hasFailed, hasSucceeded }: { hasFailed: boolean; hasSucceeded: boolean }) {
  if (hasFailed) {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
  
  if (hasSucceeded) {
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
  
  return <FileText className="h-4 w-4 text-gray-500" />;
}

function DiffRow({ line }: { line: DiffLine }) {
  const isAdded = line.type === DiffType.added;
  const isRemoved = line.type === DiffType.removed;
  const lineKey = `${line.type}-${line.leftLineNumber}-${line.rightLineNumber}`;

  return (
    <tr
      className={cn("align-baseline", {
        "bg-[#e6ffed]": isAdded,
        "bg-[#ffeef0]": isRemoved,
      })}
      key={lineKey}
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
        className={cn("w-[28px] select-none px-[10px] py-0", {
          "bg-[#cdffd8] text-[#24292e]": isAdded,
          "bg-[#ffdce0] text-[#24292e]": isRemoved,
          "bg-[#f7f7f7]": !(isAdded || isRemoved),
        })}
      >
        <pre className="m-0 p-0">
          {isAdded && "+"}
          {isRemoved && "-"}
          {!isAdded && !isRemoved && " "}
        </pre>
      </td>

      {/* Content */}
      <td
        className={cn("px-0 py-0", {
          "bg-[#e6ffed]": isAdded,
          "bg-[#ffeef0]": isRemoved,
        })}
      >
        {isAdded && (
          <ins className="no-underline">
            <pre className="break-anywhere m-0 whitespace-pre-wrap px-2 py-0 text-[#24292e] leading-[1.6em]">
              {line.value || " "}
            </pre>
          </ins>
        )}
        {isRemoved && (
          <del className="no-underline">
            <pre className="break-anywhere m-0 whitespace-pre-wrap px-2 py-0 text-[#24292e] leading-[1.6em]">
              {line.value || " "}
            </pre>
          </del>
        )}
        {!isAdded && !isRemoved && (
          <pre className="break-anywhere m-0 whitespace-pre-wrap px-2 py-0 text-[#24292e] leading-[1.6em]">
            {line.value || " "}
          </pre>
        )}
      </td>
    </tr>
  );
}

function useWriteFileDiffState(args: WriteFileDiffProps["args"], toolName: string, error?: string, success?: boolean) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const filePath = args.filePath || args.file_path || "unknown";
  const isWriteOperation = toolName === "Write" || toolName === "write_file";
  const hasFailed = !!error;
  const hasSucceeded = success === true;

  // Determine old and new content
  const { oldContent, newContent } = getFileContent(args, isWriteOperation);

  // Handle empty content case
  if (!(oldContent || newContent)) {
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

  return {
    isExpanded,
    setIsExpanded,
    showErrorDetails,
    setShowErrorDetails,
    filePath,
    isWriteOperation,
    hasFailed,
    hasSucceeded,
    diffLines,
    additions,
    deletions,
    totalLines,
    shouldShowExpand,
    displayedLines,
  };
}

function DiffContent({ displayedLines }: { displayedLines: DiffLine[] }) {
  return (
    <div className="overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse font-mono text-[13px]">
          <tbody>
            {displayedLines.map((line) => (
              <DiffRow key={`${line.type}-${line.leftLineNumber}-${line.rightLineNumber}`} line={line} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpandButton({
  isExpanded,
  setIsExpanded,
  totalLines,
}: {
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  totalLines: number;
}) {
  return (
    <motion.button
      type="button"
      className="flex w-full cursor-pointer items-center justify-center border-gray-200 border-t bg-gray-50 py-2 text-gray-500 transition-all duration-200 ease-in-out hover:bg-gray-100 hover:text-gray-600"
      initial={{ scale: 1 }}
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
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
  );
}

function ErrorSection({
  error,
  showErrorDetails,
  setShowErrorDetails,
}: {
  error: string;
  showErrorDetails: boolean;
  setShowErrorDetails: (value: boolean) => void;
}) {
  return (
    <div className="border-red-200 border-t-2 bg-red-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
        <div className="flex-1">
          <p className="mb-1 font-medium text-red-900 text-sm">
            Operation Failed
          </p>
          <p className="text-red-800 text-sm">
            {error.length > ERROR_PREVIEW_LENGTH ? `${error.slice(0, ERROR_PREVIEW_LENGTH)}...` : error}
          </p>
          {error.length > ERROR_PREVIEW_LENGTH && (
            <button
              type="button"
              className="mt-2 font-medium text-red-700 text-xs underline hover:text-red-900"
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowErrorDetails(!showErrorDetails);
                }
              }}
            >
              {showErrorDetails ? "Show less" : "Show full error"}
            </button>
          )}
          {showErrorDetails && error.length > ERROR_PREVIEW_LENGTH && (
            <div className="mt-2 rounded bg-red-100 p-2">
              <code className="whitespace-pre-wrap break-all text-red-900 text-xs">
                {error}
              </code>
            </div>
          )}
          <p className="mt-2 text-red-700 text-xs">
            💡 <strong>Tip:</strong> The file content may have changed
            since it was last read. The agent may retry with a different
            approach.
          </p>
        </div>
      </div>
    </div>
  );
}

function Header({
  filePath,
  hasFailed,
  hasSucceeded,
  additions,
  deletions,
  isWriteOperation,
}: {
  filePath: string;
  hasFailed: boolean;
  hasSucceeded: boolean;
  additions: number;
  deletions: number;
  isWriteOperation: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b px-4 py-2",
        hasFailed
          ? "border-red-200 bg-red-50"
          : "border-gray-200 bg-gray-50"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon hasFailed={hasFailed} hasSucceeded={hasSucceeded} />
          <code
            className={cn(
              "font-medium text-sm",
              hasFailed ? "text-red-900" : "text-gray-900"
            )}
          >
            {filePath}
          </code>
          {hasFailed && (
            <span className="rounded bg-red-100 px-2 py-0.5 font-medium text-red-700 text-xs">
              Failed
            </span>
          )}
          {hasSucceeded && (
            <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-700 text-xs">
              Success
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {additions > 0 && (
            <span className="font-medium text-green-600 text-sm">
              +{additions}
            </span>
          )}
          {deletions > 0 && (
            <span className="font-medium text-red-600 text-sm">
              -{deletions}
            </span>
          )}
          <span
            className={cn(
              "text-xs",
              hasFailed ? "text-red-600" : "text-gray-500"
            )}
          >
            {isWriteOperation ? "Created" : "Modified"}
          </span>
        </div>
      </div>
    </div>
  );
}

function WriteFileDiffContent({
  isExpanded,
  setIsExpanded,
  showErrorDetails,
  setShowErrorDetails,
  filePath,
  isWriteOperation,
  hasFailed,
  hasSucceeded,
  additions,
  deletions,
  totalLines,
  shouldShowExpand,
  displayedLines,
  error,
}: ReturnType<typeof useWriteFileDiffState> & { error?: string }) {
  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div
        className={cn(
          "overflow-hidden rounded-lg border-2 bg-white",
          hasFailed ? "border-red-300" : "border-gray-200"
        )}
      >
        <Header
          filePath={filePath}
          hasFailed={hasFailed}
          hasSucceeded={hasSucceeded}
          additions={additions}
          deletions={deletions}
          isWriteOperation={isWriteOperation}
        />

        <DiffContent displayedLines={displayedLines} />

        {shouldShowExpand && (
          <ExpandButton
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            totalLines={totalLines}
          />
        )}

        {hasFailed && error && (
          <ErrorSection
            error={error}
            showErrorDetails={showErrorDetails}
            setShowErrorDetails={setShowErrorDetails}
          />
        )}
      </div>
    </div>
  );
}

export function WriteFileDiff({
  toolName,
  args,
  error,
  success,
}: WriteFileDiffProps) {
  // Note: This component intentionally does not render copy content or refresh buttons
  // to keep the diff view clean and focused on the content changes
  
  const state = useWriteFileDiffState(args, toolName, error, success);
  
  if (!state) {
    return null;
  }
  
  return <WriteFileDiffContent {...state} error={error} />;
}
