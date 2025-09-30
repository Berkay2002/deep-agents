import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

import { cn } from "@/lib/utils";

type DiffLineType = "context" | "add" | "remove";

interface DiffLine {
  type: DiffLineType;
  beforeNumber: number | null;
  afterNumber: number | null;
  text: string;
}

const SNIPPET_LINE_THRESHOLD = 60;

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function computeDiff(before: string, after: string): DiffLine[] {
  const beforeLines = before.length ? normalizeLineEndings(before).split("") : [];
  const afterLines = after.length ? normalizeLineEndings(after).split("") : [];
  const m = beforeLines.length;
  const n = afterLines.length;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (beforeLines[i] === afterLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let beforeNumber = 1;
  let afterNumber = 1;

  while (i < m && j < n) {
    if (beforeLines[i] === afterLines[j]) {
      result.push({
        type: "context",
        beforeNumber,
        afterNumber,
        text: beforeLines[i],
      });
      i += 1;
      j += 1;
      beforeNumber += 1;
      afterNumber += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({
        type: "remove",
        beforeNumber,
        afterNumber: null,
        text: beforeLines[i],
      });
      i += 1;
      beforeNumber += 1;
    } else {
      result.push({
        type: "add",
        beforeNumber: null,
        afterNumber,
        text: afterLines[j],
      });
      j += 1;
      afterNumber += 1;
    }
  }

  while (i < m) {
    result.push({
      type: "remove",
      beforeNumber,
      afterNumber: null,
      text: beforeLines[i],
    });
    i += 1;
    beforeNumber += 1;
  }

  while (j < n) {
    result.push({
      type: "add",
      beforeNumber: null,
      afterNumber,
      text: afterLines[j],
    });
    j += 1;
    afterNumber += 1;
  }

  return result;
}

function DiffRow({ line }: { line: DiffLine }) {
  const base = "grid grid-cols-[3.5rem_3.5rem_1fr] gap-3 px-4 py-1.5 text-xs";
  const lineNumberClasses = "font-mono text-right text-gray-500";
  const contentClasses = "whitespace-pre-wrap break-words";
  const symbol = line.type === "add" ? "+" : line.type === "remove" ? "-" : "";

  const typeStyles =
    line.type === "add"
      ? "border-l-2 border-emerald-500 bg-emerald-500/10 text-emerald-200"
      : line.type === "remove"
        ? "border-l-2 border-rose-500 bg-rose-500/10 text-rose-200"
        : "border-l-2 border-transparent bg-gray-950 text-gray-200";

  return (
    <div className={cn(base, typeStyles)}>
      <span className={lineNumberClasses}>{line.beforeNumber ?? ""}</span>
      <span className={lineNumberClasses}>{line.afterNumber ?? ""}</span>
      <span className={cn(contentClasses, "font-mono text-xs")}>
        <span className="mr-2 text-gray-500">{symbol}</span>
        {line.text === "" ? " " : line.text}
      </span>
    </div>
  );
}

export interface WriteFileDiffProps {
  filePath: string;
  beforeContent: string;
  afterContent: string;
}

export function WriteFileDiff({ filePath, beforeContent, afterContent }: WriteFileDiffProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { diffLines, addedCount, removedCount } = useMemo(() => {
    const beforeValue = beforeContent ?? "";
    const afterValue = afterContent ?? "";
    const diff = computeDiff(beforeValue, afterValue);
    const added = diff.filter((line) => line.type === "add").length;
    const removed = diff.filter((line) => line.type === "remove").length;
    return { diffLines: diff, addedCount: added, removedCount: removed };
  }, [beforeContent, afterContent]);

  const hasLargeDiff = diffLines.length > SNIPPET_LINE_THRESHOLD;
  const showToggle = hasLargeDiff || isExpanded;
  const containerClasses = cn(
    "relative font-mono text-sm",
    isExpanded ? "max-h-[65vh] overflow-auto" : "max-h-64 overflow-hidden",
  );
  const showGradient = !isExpanded && hasLargeDiff;

  const isNewFile = beforeContent.length === 0 && afterContent.length > 0;
  const isDeletedFile = beforeContent.length > 0 && afterContent.length === 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950 text-gray-100 shadow">
        <div className="flex items-center justify-between gap-4 border-b border-gray-800 bg-gray-900 px-4 py-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="font-mono">{filePath}</span>
            {(isNewFile || isDeletedFile) && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  isNewFile
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-rose-500/20 text-rose-200",
                )}
              >
                {isNewFile ? "New file" : "Deleted"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-emerald-400">+{addedCount}</span>
            <span className="text-rose-400">-{removedCount}</span>
          </div>
        </div>
        {diffLines.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-400">No changes detected.</div>
        ) : (
          <div className={containerClasses}>
            <div className="flex flex-col">
              {diffLines.map((line, idx) => (
                <DiffRow
                  key={`${line.type}-${idx}`}
                  line={line}
                />
              ))}
            </div>
            {showGradient && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-950 to-transparent" />
            )}
          </div>
        )}
        {diffLines.length > 0 && showToggle && (
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="flex w-full items-center justify-center gap-2 border-t border-gray-800 bg-gray-900/70 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-900 hover:text-white"
          >
            {isExpanded ? (
              <>
                Collapse
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Expand
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
