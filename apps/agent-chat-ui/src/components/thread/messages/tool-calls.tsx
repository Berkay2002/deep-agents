/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <> */
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

type ToolCall = NonNullable<AIMessage["tool_calls"]>[0];

function isComplexValue(value: unknown): boolean {
  return Array.isArray(value) || (typeof value === "object" && value !== null);
}

function isTodoListArgs(
  toolName: string,
  args: Record<string, unknown>
): boolean {
  return (
    (toolName === "write_todos" || toolName === "TodoWrite") &&
    "todos" in args &&
    Array.isArray(args.todos)
  );
}

function isFileWriteArgs(
  toolName: string,
  args: Record<string, unknown>
): boolean {
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
  args: Record<string, unknown>
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

function isReadFileTool(toolName: string): boolean {
  return (
    toolName === "read_file" || toolName === "Read" || toolName === "ReadFile"
  );
}

function isSubagentTask(
  toolName: string,
  args: Record<string, unknown> | undefined,
  agentType: string
): boolean {
  return toolName === "task" && args?.subagent_type === agentType;
}

function renderTodoList(tc: ToolCall, idx: number): React.ReactElement {
  const args = tc.args as Record<string, unknown>;

  return (
    <TodoList
      key={`${tc.name}-${tc.id}-${idx}`}
      todos={(
        args.todos as Array<{
          content: string;
          status: "pending" | "in_progress" | "completed";
        }>
      ).map((todo, index) => ({
        ...todo,
        id: `${tc.id}-${index}`, // Generate unique ID for each todo
      }))}
    />
  );
}

function renderWriteFileDiff(
  tc: ToolCall,
  idx: number,
  result?: { error?: string; success?: boolean }
): React.ReactElement {
  const args = tc.args as Record<string, unknown>;
  const error = result?.error;
  const success = result?.success;

  return (
    <WriteFileDiff
      args={args}
      error={error}
      key={`${tc.name}-${tc.id}-${idx}`}
      success={success}
      toolName={tc.name}
    />
  );
}

function renderFileUpdateNotification(
  tc: ToolCall,
  idx: number,
  result?: { error?: string; success?: boolean }
): React.ReactElement {
  const args = tc.args as Record<string, unknown>;
  const error = result?.error;
  const success = result?.success;

  // Normalize args to match the component interface
  const notificationProps = {
    fileName: args.file_name as string,
    editorName: args.editor_name as string,
    timestamp: args.timestamp as string,
    oldContent: (args.old_content || args.oldContent) as string,
    newContent: (args.new_content || args.newContent) as string,
    changeType: (args.change_type || args.changeType || "modified") as
      | "created"
      | "modified"
      | "deleted",
    collaborators: (args.collaborators || []) as Array<{
      id: string;
      name: string;
      avatar?: string;
      isActive?: boolean;
      lastSeen?: Date;
    }>,
    branch: args.branch as string,
    isRealTime: (args.is_real_time || args.isRealTime) as boolean,
    error,
    success,
  };
  return (
    <FileUpdateNotification
      key={`${tc.name}-${tc.id}-${idx}`}
      {...notificationProps}
    />
  );
}

function renderDefaultToolCall(tc: ToolCall, idx: number): React.ReactElement {
  const args = tc.args as Record<string, unknown>;
  const hasArgs = Object.keys(args).length > 0;

  return (
    <div
      className="overflow-hidden rounded-lg border border-gray-200"
      key={`${tc.name}-${tc.id}-${idx}`}
    >
      <div className="border-gray-200 border-b bg-gray-50 px-4 py-2">
        <h3 className="font-medium text-gray-900">
          {tc.name}
          {tc.id && (
            <code className="ml-2 rounded-sm bg-gray-100 px-2 py-1 text-sm">
              {tc.id}
            </code>
          )}
        </h3>
      </div>
      {hasArgs ? (
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="divide-y divide-gray-200">
            {Object.entries(args).map(([key, value]) => (
              <tr key={`${key}-${String(value)}`}>
                <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-sm">
                  {key}
                </td>
                <td className="px-4 py-2 text-gray-500 text-sm">
                  {isComplexValue(value) ? (
                    <code className="break-all rounded-sm bg-gray-50 px-2 py-1 font-mono text-sm">
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
        <code className="block p-3 text-sm">{}</code>
      )}
    </div>
  );
}

function renderToolCall(
  tc: ToolCall,
  idx: number,
  result?: { error?: string; success?: boolean }
): React.ReactElement | null {
  const args = tc.args as Record<string, unknown>;

  // Check if this is a todo list tool call
  if (isTodoListArgs(tc.name, args)) {
    return renderTodoList(tc, idx);
  }

  // Check if this is a file write/edit tool call
  if (isFileWriteArgs(tc.name, args)) {
    return renderWriteFileDiff(tc, idx, result);
  }

  // Check if this is a file update notification
  if (isFileUpdateNotificationArgs(tc.name, args)) {
    return renderFileUpdateNotification(tc, idx, result);
  }

  // Check if this is a read_file tool call - don't show it here, it will be shown in ToolResult
  if (isReadFileTool(tc.name)) {
    return null; // Will be displayed by ReadFileDisplay in ToolResult
  }

  // Check if this is a subagent task - don't show it here, it will be shown in respective containers
  if (
    isSubagentTask(tc.name, args, "research-agent") ||
    isSubagentTask(tc.name, args, "critique-agent") ||
    isSubagentTask(tc.name, args, "planner-agent")
  ) {
    return null; // Will be displayed by respective agent containers
  }

  // Check if this is an exa_search tool call - don't show it here, it will be shown in ToolResult with ExaSearchResults
  if (tc.name === "exa_search") {
    return null; // Will be displayed by ExaSearchResults in ToolResult
  }

  // Default tool call display
  return renderDefaultToolCall(tc, idx);
}

export function ToolCalls({
  toolCalls,
  toolResults,
}: {
  toolCalls: AIMessage["tool_calls"];
  toolResults?: Array<{ id: string; error?: string; success?: boolean }>;
}) {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  // Create a map of tool call IDs to their results
  const resultsMap = new Map(
    toolResults?.map((r) => [r.id, { error: r.error, success: r.success }]) ||
      []
  );

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      {toolCalls.map((tc, idx) => {
        const result = tc.id ? resultsMap.get(tc.id) : undefined;
        return renderToolCall(tc, idx, result);
      })}
    </div>
  );
}

function isToolError(content: string): boolean {
  return (
    content.toLowerCase().includes("error:") ||
    content.toLowerCase().includes("failed") ||
    content.toLowerCase().includes("string not found") ||
    content.toLowerCase().includes("permission denied") ||
    content.toLowerCase().includes("timeout") ||
    content.toLowerCase().includes("timed out")
  );
}

function isFileOperation(name: string | undefined): boolean {
  return (
    name === "write_file" ||
    name === "edit_file" ||
    name === "Write" ||
    name === "Edit" ||
    name === "MultiEdit"
  );
}

function renderReadFileResult(
  message: ToolMessage,
  toolCall:
    | {
        name: string;
        args: Record<string, unknown>;
        id?: string;
        type?: string;
      }
    | undefined
): React.ReactElement {
  // Use the tool call args if available
  const fileReadArgs = toolCall?.args || {
    filePath: "unknown",
  };

  return (
    <ReadFileDisplay
      args={fileReadArgs}
      content={message.content as string}
      toolName={message.name || "read_file"}
    />
  );
}

function renderSpecializedToolResult(
  message: ToolMessage,
  parsedContent: unknown
): React.ReactElement | null {
  // Check if this is an ls tool result
  if (message.name === "ls") {
    // ls returns an array of file paths
    const files = Array.isArray(parsedContent) ? parsedContent : [];
    return <LsResult files={files} />;
  }

  // Check if this is a topic_analysis tool result
  if (message.name === "topic_analysis") {
    return (
      <TopicAnalysisResult
        result={
          parsedContent as {
            topicType?: string;
            complexity?: string;
            estimatedResearchAreas?: string[];
            suggestedSources?: string[];
            estimatedTimeframe?: string;
          }
        }
      />
    );
  }

  // Check if this is a scope_estimation tool result
  if (message.name === "scope_estimation") {
    return (
      <ScopeEstimationResult
        result={
          parsedContent as {
            estimatedTotalHours?: number;
            researchTasks?: Array<{
              area: string;
              estimatedTime: number;
              priority: "high" | "medium" | "low";
            }>;
            suggestedMilestones?: string[];
            resourceRequirements?: {
              searchTools?: string[];
              timeAllocation?: string;
              expertiseLevel?: string;
            };
          }
        }
      />
    );
  }

  // Check if this is a plan_optimization tool result
  if (message.name === "plan_optimization") {
    return (
      <PlanOptimizationResult
        result={
          parsedContent as {
            optimizedPlan?: string[];
            identifiedGaps?: string[];
            suggestionsForImprovement?: string[];
            estimatedImprovement?: string;
          }
        }
      />
    );
  }

  return null;
}

function checkTavilySearchResult(
  parsedContent: unknown
): parsedContent is Record<string, unknown> & {
  results: Array<{ url: string; content: string }>;
} {
  if (
    typeof parsedContent !== "object" ||
    parsedContent === null ||
    !("results" in parsedContent) ||
    !Array.isArray((parsedContent as Record<string, unknown>).results)
  ) {
    return false;
  }

  const results = (parsedContent as Record<string, unknown>)
    .results as unknown[];
  return (
    results.length > 0 &&
    typeof (results[0] as Record<string, unknown>).url === "string" &&
    "content" in (results[0] as Record<string, unknown>)
  );
}

function checkExaSearchResult(parsedContent: unknown): parsedContent is Record<
  string,
  unknown
> & {
  results: Array<{
    url: string;
    text?: string;
    summary?: string;
    snippet?: string;
    highlights?: unknown;
  }>;
} {
  if (
    typeof parsedContent !== "object" ||
    parsedContent === null ||
    !("results" in parsedContent) ||
    !Array.isArray((parsedContent as Record<string, unknown>).results)
  ) {
    return false;
  }

  const results = (parsedContent as Record<string, unknown>)
    .results as unknown[];
  if (
    results.length === 0 ||
    typeof (results[0] as Record<string, unknown>).url !== "string"
  ) {
    return false;
  }

  const firstResult = results[0] as Record<string, unknown>;
  return (
    "text" in firstResult ||
    "summary" in firstResult ||
    "snippet" in firstResult ||
    "highlights" in firstResult
  );
}

function renderSearchResults(
  isJsonContent: boolean,
  parsedContent: unknown
): React.ReactElement | null {
  if (!isJsonContent) {
    return null;
  }

  if (checkTavilySearchResult(parsedContent)) {
    return (
      <TavilySearchResults
        query={(parsedContent.query as string) || ""}
        responseTime={parsedContent.response_time as number}
        results={
          parsedContent.results as {
            url: string;
            title: string;
            content: string;
            score?: number;
          }[]
        }
      />
    );
  }

  if (checkExaSearchResult(parsedContent)) {
    return (
      <ExaSearchResults
        query={(parsedContent.query as string) || ""}
        responseTime={parsedContent.response_time as number}
        results={
          parsedContent.results as {
            url: string;
            title?: string | null;
            summary?: string | null;
            snippet?: string | null;
            fullText?: string | null;
            author?: string | null;
            publishedDate?: string | null;
            highlights?: { snippet?: string | null; source?: string | null }[];
          }[]
        }
      />
    );
  }

  return null;
}

function renderJsonTable(
  parsedContent: unknown,
  isExpanded: boolean,
  maxArrayItems: number
): React.ReactElement {
  let items: unknown[] | [string, unknown][];

  if (Array.isArray(parsedContent)) {
    items = isExpanded ? parsedContent : parsedContent.slice(0, maxArrayItems);
  } else {
    items = Object.entries(parsedContent as Record<string, unknown>);
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <tbody className="divide-y divide-gray-200">
        {items.map((item, argIdx) => {
          let key: unknown;
          let value: unknown;

          if (Array.isArray(parsedContent)) {
            key = argIdx;
            value = item;
          } else {
            const entry = item as [string, unknown];
            key = entry[0];
            value = entry[1];
          }

          const itemKey = Array.isArray(parsedContent)
            ? `${key}-${value}`
            : `${key}-${String(value)}`;
          return (
            <tr key={itemKey}>
              <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-sm">
                {String(key)}
              </td>
              <td className="px-4 py-2 text-gray-500 text-sm">
                {isComplexValue(value) ? (
                  <code className="break-all rounded-sm bg-gray-50 px-2 py-1 font-mono text-sm">
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
  );
}

function DefaultContentRenderer({
  message,
  parsedContent,
  isJsonContent,
}: {
  message: ToolMessage;
  parsedContent: unknown;
  isJsonContent: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const contentStr = isJsonContent
    ? JSON.stringify(parsedContent, null, 2)
    : String(message.content);
  const contentLines = contentStr.split("\n");
  const maxLines = 4;
  const maxChars = 500;
  const maxArrayItems = 5;
  const shouldTruncate =
    contentLines.length > maxLines || contentStr.length > maxChars;
  let displayedContent = contentStr;

  if (shouldTruncate && !isExpanded) {
    if (contentStr.length > maxChars) {
      displayedContent = `${contentStr.substring(0, maxChars)}...`;
    } else {
      displayedContent = `${contentLines.slice(0, maxLines).join("\n")}\n...`;
    }
  }

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="border-gray-200 border-b bg-gray-50 px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {message.name ? (
              <h3 className="font-medium text-gray-900">
                Tool Result:{" "}
                <code className="rounded-sm bg-gray-100 px-2 py-1">
                  {message.name}
                </code>
              </h3>
            ) : (
              <h3 className="font-medium text-gray-900">Tool Result</h3>
            )}
            {message.tool_call_id && (
              <code className="ml-2 rounded-sm bg-gray-100 px-2 py-1 text-sm">
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
                  renderJsonTable(parsedContent, isExpanded, maxArrayItems)
                ) : (
                  <code className="block text-sm">{displayedContent}</code>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          {((shouldTruncate && !isJsonContent) ||
            (isJsonContent &&
              Array.isArray(parsedContent) &&
              parsedContent.length > maxArrayItems)) && (
            <motion.button
              className="flex w-full cursor-pointer items-center justify-center border-gray-200 border-t py-2 text-gray-500 transition-all duration-200 ease-in-out hover:bg-gray-50 hover:text-gray-600"
              initial={{ scale: 1 }}
              onClick={() => setIsExpanded(!isExpanded)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setIsExpanded(!isExpanded);
                }
              }}
              type="button"
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

export function ToolResult({
  message,
  toolCall,
}: {
  message: ToolMessage;
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
    id?: string;
    type?: string;
  };
}) {
  let parsedContent: unknown;
  let isJsonContent = false;

  if (typeof message.content === "string") {
    try {
      parsedContent = JSON.parse(message.content);
      isJsonContent = isComplexValue(parsedContent);
    } catch {
      // Content is not JSON, use as is
      parsedContent = message.content;
    }
  } else {
    parsedContent = message.content;
  }

  // Check if this is a read_file result
  const isReadFile = message.name && isReadFileTool(message.name);

  if (
    isReadFile &&
    typeof message.content === "string" &&
    message.content.length > 0
  ) {
    return renderReadFileResult(message, toolCall);
  }

  // Check if this is a file operation - hide all file operation results (shown in WriteFileDiff)
  if (message.name && isFileOperation(message.name)) {
    return null; // Will be displayed by WriteFileDiff
  }

  // Check if this is an error result
  if (typeof message.content === "string" && isToolError(message.content)) {
    return null; // Filter out tool errors - don't display them as they're internal mistakes
  }

  // Check if this is a subagent task result - hide it since respective containers handle it
  if (
    toolCall?.name === "task" &&
    (toolCall?.args?.subagent_type === "research-agent" ||
      toolCall?.args?.subagent_type === "critique-agent" ||
      toolCall?.args?.subagent_type === "planner-agent")
  ) {
    return null; // Will be displayed by respective agent containers
  }

  // Check for specialized tool results
  const specializedResult = renderSpecializedToolResult(message, parsedContent);
  if (specializedResult) {
    return specializedResult;
  }

  // Check for search results
  const searchResult = renderSearchResults(isJsonContent, parsedContent);
  if (searchResult) {
    return searchResult;
  }

  // Default content display
  return (
    <DefaultContentRenderer
      isJsonContent={isJsonContent}
      message={message}
      parsedContent={parsedContent}
    />
  );
}
