import type { AIMessage, ToolMessage } from "@langchain/langgraph-sdk";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { TodoList } from "../todo-list";
import { ExaSearchResults } from "./exa-search-results";
import { FileUpdateNotification } from "./file-update-notification";
import { LsResult } from "./ls-result";
import { PlanOptimizationResult } from "./plan-optimization-result";
import { ReadFileDisplay } from "./read-file-display";
import { ScopeEstimationResult } from "./scope-estimation-result";
import { TavilySearchResults } from "./tavily-search-results";
import { TopicAnalysisResult } from "./topic-analysis-result";
import { WriteFileDiff } from "./write-file-diff";

function isComplexValue(value: any): boolean {
  return Array.isArray(value) || (typeof value === "object" && value !== null);
}

function isTodoListArgs(toolName: string, args: Record<string, any>): boolean {
  return (
    (toolName === "write_todos" || toolName === "TodoWrite") &&
    "todos" in args &&
    Array.isArray(args.todos)
  );
}

function isFileWriteArgs(toolName: string, args: Record<string, any>): boolean {
  const fileWriteTools = [
    "Write",
    "Edit",
    "MultiEdit",
    "write_file",
    "edit_file",
  ];
  return (
    fileWriteTools.includes(toolName) &&
    "file_path" in args &&
    (("old_string" in args && "new_string" in args) || "content" in args)
  );
}
function isFileUpdateNotificationArgs(
  toolName: string,
  args: Record<string, any>
): boolean {
  // Check if this is a collaborative file update with metadata
  return (
    (toolName === "file_update_notification" ||
      toolName === "collaborative_file_update") &&
    "file_name" in args &&
    "editor_name" in args &&
    "timestamp" in args &&
    ("change_type" in args || "changeType" in args)
  );
}

export function ToolCalls({
  toolCalls,
  toolResults,
}: {
  toolCalls: AIMessage["tool_calls"];
  toolResults?: Array<{ id: string; error?: string; success?: boolean }>;
}) {
  if (!toolCalls || toolCalls.length === 0) return null;

  // Create a map of tool call IDs to their results
  const resultsMap = new Map(
    toolResults?.map((r) => [r.id, { error: r.error, success: r.success }]) ||
      []
  );

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      {toolCalls.map((tc, idx) => {
        const args = tc.args as Record<string, any>;
        const hasArgs = Object.keys(args).length > 0;
        const result = tc.id ? resultsMap.get(tc.id) : undefined;
        const error = result?.error;
        const success = result?.success;

        // Check if this is a todo list tool call
        if (isTodoListArgs(tc.name, args)) {
          return <TodoList key={idx} todos={args.todos} />;
        }

        // Check if this is a file write/edit tool call
        if (isFileWriteArgs(tc.name, args)) {
          return (
            <WriteFileDiff
              args={args}
              error={error}
              key={idx}
              success={success}
              toolName={tc.name}
            />
          );
        }

        // Check if this is a file update notification
        if (isFileUpdateNotificationArgs(tc.name, args)) {
          // Normalize args to match the component interface
          const notificationProps = {
            fileName: args.file_name,
            editorName: args.editor_name,
            timestamp: args.timestamp,
            oldContent: args.old_content || args.oldContent,
            newContent: args.new_content || args.newContent,
            changeType: args.change_type || args.changeType || "modified",
            collaborators: args.collaborators || [],
            branch: args.branch,
            isRealTime: args.is_real_time || args.isRealTime,
            error,
            success,
          };
          return <FileUpdateNotification key={idx} {...notificationProps} />;
        }

        // Check if this is a read_file tool call - don't show it here, it will be shown in ToolResult
        const isReadFile =
          tc.name === "read_file" ||
          tc.name === "Read" ||
          tc.name === "ReadFile";
        if (isReadFile) {
          return null; // Will be displayed by ReadFileDisplay in ToolResult
        }

        // Check if this is a research agent task - don't show it here, it will be shown in ResearchAgentContainer
        const isResearchAgentTask =
          tc.name === "task" && args?.subagent_type === "research-agent";
        if (isResearchAgentTask) {
          return null; // Will be displayed by ResearchAgentContainer
        }

        // Check if this is a critique agent task - don't show it here, it will be shown in CritiqueAgentContainer
        const isCritiqueAgentTask =
          tc.name === "task" && args?.subagent_type === "critique-agent";
        if (isCritiqueAgentTask) {
          return null; // Will be displayed by CritiqueAgentContainer
        }

        // Check if this is a planner agent task - don't show it here, it will be shown in PlannerAgentContainer
        const isPlannerAgentTask =
          tc.name === "task" && args?.subagent_type === "planner-agent";
        if (isPlannerAgentTask) {
          return null; // Will be displayed by PlannerAgentContainer
        }

        return (
          <div
            className="overflow-hidden rounded-lg border border-gray-200"
            key={idx}
          >
            <div className="border-gray-200 border-b bg-gray-50 px-4 py-2">
              <h3 className="font-medium text-gray-900">
                {tc.name}
                {tc.id && (
                  <code className="ml-2 rounded bg-gray-100 px-2 py-1 text-sm">
                    {tc.id}
                  </code>
                )}
              </h3>
            </div>
            {hasArgs ? (
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(args).map(([key, value], argIdx) => (
                    <tr key={argIdx}>
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-sm">
                        {key}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-sm">
                        {isComplexValue(value) ? (
                          <code className="break-all rounded bg-gray-50 px-2 py-1 font-mono text-sm">
                            {JSON.stringify(value, null, 2)}
                          </code>
                        ) : (
                          String(value)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <code className="block p-3 text-sm">{"{}"}</code>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ToolResult({
  message,
  toolCall,
}: {
  message: ToolMessage;
  toolCall?: {
    name: string;
    args: Record<string, any>;
    id?: string;
    type?: string;
  };
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  let parsedContent: any;
  let isJsonContent = false;

  try {
    if (typeof message.content === "string") {
      parsedContent = JSON.parse(message.content);
      isJsonContent = isComplexValue(parsedContent);
    }
  } catch {
    // Content is not JSON, use as is
    parsedContent = message.content;
  }

  // Check if this is a read_file result
  const isReadFile =
    message.name &&
    (message.name === "read_file" ||
      message.name === "Read" ||
      message.name === "ReadFile");

  if (
    isReadFile &&
    typeof message.content === "string" &&
    message.content.length > 0
  ) {
    // Use the tool call args if available
    const fileReadArgs = toolCall?.args || {
      file_path: "unknown",
    };

    return (
      <ReadFileDisplay
        args={fileReadArgs}
        content={message.content}
        toolName={message.name || "read_file"}
      />
    );
  }

  // Check if this is a file operation - hide all file operation results (shown in WriteFileDiff)
  const isFileOperation =
    message.name &&
    (message.name === "write_file" ||
      message.name === "edit_file" ||
      message.name === "Write" ||
      message.name === "Edit" ||
      message.name === "MultiEdit");

  if (isFileOperation) {
    return null; // Will be displayed by WriteFileDiff
  }

  // Check if this is an error result
  const isError =
    typeof message.content === "string" &&
    (message.content.toLowerCase().includes("error:") ||
      message.content.toLowerCase().includes("failed") ||
      message.content.toLowerCase().includes("string not found") ||
      message.content.toLowerCase().includes("permission denied") ||
      message.content.toLowerCase().includes("timeout") ||
      message.content.toLowerCase().includes("timed out"));

  // Filter out tool errors - don't display them as they're internal mistakes
  if (isError) {
    return null;
  }

  // Check if this is a research agent task result - hide it since ResearchAgentContainer handles it
  const isResearchAgentTaskResult =
    toolCall?.name === "task" &&
    toolCall?.args?.subagent_type === "research-agent";

  if (isResearchAgentTaskResult) {
    return null; // Will be displayed by ResearchAgentContainer
  }

  // Check if this is a critique agent task result - hide it since CritiqueAgentContainer handles it
  const isCritiqueAgentTaskResult =
    toolCall?.name === "task" &&
    toolCall?.args?.subagent_type === "critique-agent";

  if (isCritiqueAgentTaskResult) {
    return null; // Will be displayed by CritiqueAgentContainer
  }

  // Check if this is a planner agent task result - hide it since PlannerAgentContainer handles it
  const isPlannerAgentTaskResult =
    toolCall?.name === "task" &&
    toolCall?.args?.subagent_type === "planner-agent";

  if (isPlannerAgentTaskResult) {
    return null; // Will be displayed by PlannerAgentContainer
  }

  // Check if this is an ls tool result
  if (message.name === "ls") {
    try {
      // ls returns an array of file paths
      const files = Array.isArray(parsedContent) ? parsedContent : [];
      return <LsResult files={files} />;
    } catch {
      // Fall through to default display
    }
  }

  // Check if this is a topic_analysis tool result
  if (message.name === "topic_analysis") {
    return <TopicAnalysisResult result={parsedContent} />;
  }

  // Check if this is a scope_estimation tool result
  if (message.name === "scope_estimation") {
    return <ScopeEstimationResult result={parsedContent} />;
  }

  // Check if this is a plan_optimization tool result
  if (message.name === "plan_optimization") {
    return <PlanOptimizationResult result={parsedContent} />;
  }

  // Check if this is a Tavily search result (has 'content' field)
  const isTavilySearchResult =
    isJsonContent &&
    typeof parsedContent === "object" &&
    "results" in parsedContent &&
    Array.isArray(parsedContent.results) &&
    parsedContent.results.length > 0 &&
    parsedContent.results[0].url &&
    parsedContent.results[0].content !== undefined;

  if (isTavilySearchResult) {
    return (
      <TavilySearchResults
        query={parsedContent.query || ""}
        responseTime={parsedContent.response_time}
        results={parsedContent.results}
      />
    );
  }

  // Check if this is an Exa search result (has 'text', 'summary', 'snippet', or 'highlights')
  const isExaSearchResult =
    isJsonContent &&
    typeof parsedContent === "object" &&
    "results" in parsedContent &&
    Array.isArray(parsedContent.results) &&
    parsedContent.results.length > 0 &&
    parsedContent.results[0].url &&
    (parsedContent.results[0].text !== undefined ||
      parsedContent.results[0].summary !== undefined ||
      parsedContent.results[0].snippet !== undefined ||
      parsedContent.results[0].highlights !== undefined);

  if (isExaSearchResult) {
    return (
      <ExaSearchResults
        query={parsedContent.query || ""}
        responseTime={parsedContent.response_time}
        results={parsedContent.results}
      />
    );
  }

  const contentStr = isJsonContent
    ? JSON.stringify(parsedContent, null, 2)
    : String(message.content);
  const contentLines = contentStr.split("\n");
  const shouldTruncate = contentLines.length > 4 || contentStr.length > 500;
  const displayedContent =
    shouldTruncate && !isExpanded
      ? contentStr.length > 500
        ? contentStr.slice(0, 500) + "..."
        : contentLines.slice(0, 4).join("\n") + "\n..."
      : contentStr;

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="border-gray-200 border-b bg-gray-50 px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {message.name ? (
              <h3 className="font-medium text-gray-900">
                Tool Result:{" "}
                <code className="rounded bg-gray-100 px-2 py-1">
                  {message.name}
                </code>
              </h3>
            ) : (
              <h3 className="font-medium text-gray-900">Tool Result</h3>
            )}
            {message.tool_call_id && (
              <code className="ml-2 rounded bg-gray-100 px-2 py-1 text-sm">
                {message.tool_call_id}
              </code>
            )}
          </div>
        </div>
        <motion.div
          animate={{ height: "auto" }}
          className="min-w-full bg-gray-100"
          initial={false}
          transition={{ duration: 0.3 }}
        >
          <div className="p-3">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                initial={{ opacity: 0, y: 20 }}
                key={isExpanded ? "expanded" : "collapsed"}
                transition={{ duration: 0.2 }}
              >
                {isJsonContent ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <tbody className="divide-y divide-gray-200">
                      {(Array.isArray(parsedContent)
                        ? isExpanded
                          ? parsedContent
                          : parsedContent.slice(0, 5)
                        : Object.entries(parsedContent)
                      ).map((item, argIdx) => {
                        const [key, value] = Array.isArray(parsedContent)
                          ? [argIdx, item]
                          : [item[0], item[1]];
                        return (
                          <tr key={argIdx}>
                            <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-sm">
                              {key}
                            </td>
                            <td className="px-4 py-2 text-gray-500 text-sm">
                              {isComplexValue(value) ? (
                                <code className="break-all rounded bg-gray-50 px-2 py-1 font-mono text-sm">
                                  {JSON.stringify(value, null, 2)}
                                </code>
                              ) : (
                                String(value)
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <code className="block text-sm">{displayedContent}</code>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          {((shouldTruncate && !isJsonContent) ||
            (isJsonContent &&
              Array.isArray(parsedContent) &&
              parsedContent.length > 5)) && (
            <motion.button
              className="flex w-full cursor-pointer items-center justify-center border-gray-200 border-t-[1px] py-2 text-gray-500 transition-all duration-200 ease-in-out hover:bg-gray-50 hover:text-gray-600"
              initial={{ scale: 1 }}
              onClick={() => setIsExpanded(!isExpanded)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
