"use client";

import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, FileText, Folder } from "lucide-react";
import { useState } from "react";

type LsResultProps = {
  files: string[];
};

export function LsResult({ files }: LsResultProps) {
  const [isExpanded, setIsExpanded] = useState(files.length <= 10);

  if (!files || files.length === 0) {
    return (
      <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-gray-500 text-sm">No files found</p>
        </div>
      </div>
    );
  }

  const displayedFiles = isExpanded ? files : files.slice(0, 10);
  const shouldTruncate = files.length > 10;
  const fileKeyCounts = new Map<string, number>();

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <div className="border-gray-200 border-b bg-gray-50 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">File Listing</h3>
              <span className="text-gray-500 text-sm">
                ({files.length} {files.length === 1 ? "file" : "files"})
              </span>
            </div>
            {shouldTruncate && (
              <button
                aria-label={isExpanded ? "Show less" : "Show all"}
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setIsExpanded(!isExpanded)}
                type="button"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* File List */}
        <motion.div
          animate={{ height: "auto" }}
          initial={false}
          transition={{ duration: 0.2 }}
        >
          <div className="divide-y divide-gray-100">
            {displayedFiles.map((file) => {
              // Determine if it's a directory (simple heuristic: no extension or ends with /)
              const isDirectory = file.endsWith("/") || !file.includes(".");

              const occurrence = fileKeyCounts.get(file) ?? 0;
              const itemKey = occurrence === 0 ? file : `${file}-${occurrence}`;
              fileKeyCounts.set(file, occurrence + 1);

              return (
                <div
                  className="flex items-center gap-2 px-4 py-2 transition-colors hover:bg-gray-50"
                  key={itemKey}
                >
                  {isDirectory ? (
                    <Folder className="h-4 w-4 shrink-0 text-blue-500" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <code className="font-mono text-gray-700 text-sm">
                    {file}
                  </code>
                </div>
              );
            })}
          </div>

          {/* Show More/Less Button */}
          {shouldTruncate && (
            <motion.button
              className="flex w-full cursor-pointer items-center justify-center border-gray-200 border-t py-2 text-gray-500 transition-all duration-200 ease-in-out hover:bg-gray-50 hover:text-gray-600"
              initial={{ scale: 1 }}
              onClick={() => setIsExpanded(!isExpanded)}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isExpanded ? (
                <>
                  <span className="mr-1 text-sm">Show less</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span className="mr-1 text-sm">
                    Show all ({files.length - 10} more)
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
