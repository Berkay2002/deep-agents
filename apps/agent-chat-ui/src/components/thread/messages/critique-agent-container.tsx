"use client";

import { motion } from "framer-motion";
import {
  Book,
  ChevronDown,
  ChevronUp,
  FileCheck,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

type FileRead = {
  filePath: string;
  content: string;
  toolCallId: string;
};

type CritiqueAgent = {
  taskDescription: string;
  critique?: string;
  fileReads: FileRead[];
};

type CritiqueAgentContainerProps = {
  agents: CritiqueAgent[];
};

export function CritiqueAgentContainer({
  agents,
}: CritiqueAgentContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  if (agents.length === 0) {
    return null;
  }

  const currentAgent = agents[activeTab];

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <div className="border-gray-200 border-b bg-purple-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <MessageSquare className="h-4 w-4 shrink-0 text-purple-600" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Critique Agents
                </h3>
                {agents.length > 1 && (
                  <p className="mt-0.5 text-gray-500 text-xs">
                    {agents.length} {agents.length === 1 ? "agent" : "agents"}{" "}
                    active
                  </p>
                )}
              </div>
            </div>
            <button
              aria-label={isExpanded ? "Collapse" : "Expand"}
              className="shrink-0 text-gray-500 hover:text-gray-700"
              onClick={() => setIsExpanded(!isExpanded)}
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

        {/* Tabs - Show even when collapsed if there are multiple agents */}
        {agents.length > 1 && (
          <div className="border-gray-200 border-b bg-white">
            <div className="flex overflow-x-auto">
              {agents.map((_agent, idx) => (
                <button
                  className={`shrink-0 border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === idx
                      ? "border-purple-600 bg-purple-50 text-purple-600"
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  key={`agent-tab-${idx}-${_agent.taskDescription.slice(0, 10)}`}
                  onClick={() => setActiveTab(idx)}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <span>Agent {idx + 1}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed Preview - Task and Read Critique button */}
        {!isExpanded && (
          <div className="bg-white p-4">
            <p className="mb-3 text-gray-700 text-sm">
              <span className="font-medium text-gray-900">Task:</span>{" "}
              {currentAgent.taskDescription}
            </p>
            {currentAgent.critique && (
              <button
                className="inline-flex items-center gap-2 font-medium text-purple-600 text-sm transition-colors hover:text-purple-700"
                onClick={() => setIsExpanded(true)}
                type="button"
              >
                <FileCheck className="h-4 w-4" />
                Read Critique
              </button>
            )}
          </div>
        )}

        {/* Expanded Content */}
        <motion.div
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          className="overflow-hidden"
          initial={false}
          transition={{ duration: 0.2 }}
        >
          <div className="max-h-[600px] overflow-y-auto">
            {/* Task Description */}
            <div className="border-gray-100 border-b bg-purple-50 p-4">
              <p className="text-gray-700 text-sm">
                <span className="font-medium text-gray-900">Task:</span>{" "}
                {currentAgent.taskDescription}
              </p>
            </div>

            {/* File Reads Section */}
            {currentAgent.fileReads && currentAgent.fileReads.length > 0 && (
              <div className="border-gray-100 border-b p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Book className="h-3.5 w-3.5 text-purple-600" />
                  <h4 className="font-medium text-gray-700 text-sm">
                    Files Read ({currentAgent.fileReads.length})
                  </h4>
                </div>
                <div className="space-y-3">
                  {currentAgent.fileReads.map((fileRead, idx) => (
                    <FileReadItem
                      fileRead={fileRead}
                      key={`file-${idx}-${fileRead.filePath}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Critique Section */}
            {currentAgent.critique && (
              <div className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileCheck className="h-3.5 w-3.5 text-purple-600" />
                  <h4 className="font-medium text-gray-700 text-sm">
                    Critique
                  </h4>
                </div>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
                    {currentAgent.critique}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FileReadItem({ fileRead }: { fileRead: FileRead }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const PreviewLines = 3;
  const LinePreviewLength = 5;

  const contentLines = fileRead.content.split("\n");
  const totalLines = contentLines.length;
  const shouldShowExpand = totalLines > PreviewLines;

  const displayedLines = isExpanded
    ? contentLines
    : contentLines.slice(0, PreviewLines);

  return (
    <div className="overflow-hidden rounded-md border border-purple-200 bg-purple-50/30">
      {/* File path header */}
      <button
        className="flex w-full cursor-pointer items-center justify-between border-purple-200 border-b bg-purple-100/50 px-3 py-2 transition-colors hover:bg-purple-100"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        type="button"
      >
        <code className="font-medium text-purple-900 text-xs">
          {fileRead.filePath}
        </code>
        <div className="flex items-center gap-2">
          <span className="text-purple-600 text-xs">
            {totalLines} {totalLines === 1 ? "line" : "lines"}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-purple-500" />
          ) : (
            <ChevronDown className="h-3 w-3 text-purple-500" />
          )}
        </div>
      </button>

      {/* File content */}
      <div className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <tbody>
              {displayedLines.map((line, index) => (
                <tr
                  className="transition-colors hover:bg-purple-50"
                  key={`${fileRead.filePath}-line-${index}-${line.slice(0, LinePreviewLength)}`}
                >
                  <td className="w-[40px] min-w-[40px] select-none border-purple-100 border-r bg-gray-50 px-2 py-0 text-right">
                    <pre className="m-0 p-0 text-gray-500 text-xs">
                      {index + 1}
                    </pre>
                  </td>
                  <td className="bg-white px-2 py-0">
                    <pre className="break-anywhere m-0 whitespace-pre-wrap px-2 py-0 text-gray-700 leading-relaxed">
                      {line || " "}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expand/Collapse Button */}
        {shouldShowExpand && (
          <button
            className="flex w-full cursor-pointer items-center justify-center border-purple-200 border-t bg-purple-50/50 py-1.5 text-purple-600 text-xs transition-all duration-200 ease-in-out hover:bg-purple-100"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            type="button"
          >
            <span className="mr-1">
              {isExpanded
                ? "Show less"
                : `Show more (${totalLines - PreviewLines} more lines)`}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
