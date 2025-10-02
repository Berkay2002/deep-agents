"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Folder, FileText } from "lucide-react";

interface LsResultProps {
  files: string[];
}

export function LsResult({ files }: LsResultProps) {
  const [isExpanded, setIsExpanded] = useState(files.length <= 10);

  if (!files || files.length === 0) {
    return (
      <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-500">No files found</p>
        </div>
      </div>
    );
  }

  const displayedFiles = isExpanded ? files : files.slice(0, 10);
  const shouldTruncate = files.length > 10;

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">File Listing</h3>
              <span className="text-sm text-gray-500">
                ({files.length} {files.length === 1 ? "file" : "files"})
              </span>
            </div>
            {shouldTruncate && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-500 hover:text-gray-700"
                aria-label={isExpanded ? "Show less" : "Show all"}
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
          initial={false}
          animate={{ height: "auto" }}
          transition={{ duration: 0.2 }}
        >
          <div className="divide-y divide-gray-100">
            {displayedFiles.map((file, index) => {
              // Determine if it's a directory (simple heuristic: no extension or ends with /)
              const isDirectory = file.endsWith("/") || !file.includes(".");

              return (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  {isDirectory ? (
                    <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <code className="text-sm font-mono text-gray-700">
                    {file}
                  </code>
                </div>
              );
            })}
          </div>

          {/* Show More/Less Button */}
          {shouldTruncate && (
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex w-full cursor-pointer items-center justify-center border-t border-gray-200 py-2 text-gray-500 transition-all duration-200 ease-in-out hover:bg-gray-50 hover:text-gray-600"
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isExpanded ? (
                <>
                  <span className="text-sm mr-1">Show less</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span className="text-sm mr-1">
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
