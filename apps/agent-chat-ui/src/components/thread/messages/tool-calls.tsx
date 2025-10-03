/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <> */
import type { AIMessage, ToolMessage } from "@langchain/langgraph-sdk";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { TodoList } from "../todo-list";
import { AnalyzeCompletenessResult } from "./analyze-completeness-result";
import { ComposePlanResult } from "./compose-plan-result";
import { ErrorResult } from "./error-result";
import { EvaluateStructureResult } from "./evaluate-structure-result";
import { ExaSearchResults } from "./exa-search-results";
import { FactCheckResult } from "./fact-check-result";
import { FileUpdateNotification } from "./file-update-notification";
import { LsResult } from "./ls-result";
import { PlanOptimizationResult } from "./plan-optimization-result";
import { ReadFileDisplay } from "./read-file-display";
import { SaveCritiqueResult } from "./save-critique-result";
import { SaveResearchFindingsResult } from "./save-research-findings-result";
import { ScopeEstimationResult } from "./scope-estimation-result";
import { SubagentTaskResult } from "./subagent-result";
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

  // TEMPORARY: Show all tool calls without filtering to verify hypothesis
  // Previously filtered: read_file, subagent tasks, exa_search

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

  // Pre-filter to get only non-null rendered tool calls
  // This prevents empty cards from appearing when renderToolCall returns null
  // (e.g., for read_file, subagent tasks that are rendered elsewhere)
  const renderedCalls = toolCalls
    .map((tc, idx) => {
      const result = tc.id ? resultsMap.get(tc.id) : undefined;
      const element = renderToolCall(tc, idx, result);
      return { element, key: `${tc.name}-${tc.id}-${idx}` };
    })
    .filter((item) => item.element !== null);

  // Return null if no tool calls render anything (prevents empty container divs)
  if (renderedCalls.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      {renderedCalls.map(({ element, key }) => (
        <div key={key}>{element}</div>
      ))}
    </div>
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
  // Check if this is a write_todos tool result - hide it since the TodoList is shown in the tool call
  if (message.name === "write_todos" || message.name === "TodoWrite") {
    return null; // TodoList is already rendered from the tool call, no need to show the result
  }

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

  // Check if this is a compose_plan tool result
  if (message.name === "compose_plan") {
    return (
      <ComposePlanResult
        result={
          parsedContent as {
            event: "compose_plan_completed";
            topic: string;
            metadataPath: string;
            paths: {
              analysis: string;
              scope: string;
              plan: string;
              optimized: string;
              metadata: string;
            };
            summary: {
              topicType: string;
              complexity: string;
              estimatedTimeframe: string;
              taskCount: number;
              milestoneCount: number;
            };
            artifacts: {
              analysisPath: string;
              scopePath: string;
              planPath: string;
            };
            timestamp: string;
          }
        }
      />
    );
  }

  // Check if this is a save_research_findings tool result
  if (message.name === "save_research_findings") {
    return (
      <SaveResearchFindingsResult
        result={
          parsedContent as {
            topic: string;
            findings: Array<{
              fact: string;
              source: string;
              category: string;
            }>;
            sources: string[];
            categories: string[];
            totalFindings: number;
            metadata?: Record<string, unknown>;
            timestamp: string;
          }
        }
      />
    );
  }

  // Check if this is a fact_check tool result
  if (message.name === "fact_check") {
    return (
      <FactCheckResult
        result={
          parsedContent as {
            claim: string;
            context?: string;
            verified: boolean;
            sources: Array<{
              title: string;
              url: string;
              snippet: string;
            }>;
            synthesizedAnswer?: string | null;
            confidence: "high" | "medium" | "low";
            notes: string;
            timestamp: string;
          }
        }
      />
    );
  }

  // Check if this is an evaluate_structure tool result
  if (message.name === "evaluate_structure") {
    return (
      <EvaluateStructureResult
        result={
          parsedContent as {
            reportPath: string;
            sectionCount: number;
            mainSections: number;
            headingHierarchy: Array<{
              level: number;
              title: string;
              line: number;
            }>;
            paragraphCount: number;
            wordCount: number;
            paragraphsPerSection: Record<string, number>;
            issues: Array<{
              issue: string;
              severity: string;
              location: string;
            }>;
            recommendations: string[];
            score: number;
            timestamp: string;
          }
        }
      />
    );
  }

  // Check if this is an analyze_completeness tool result
  if (message.name === "analyze_completeness") {
    return (
      <AnalyzeCompletenessResult
        result={
          parsedContent as {
            reportPath: string;
            questionPath: string;
            coverageScore: number;
            coveredAreas: string[];
            missingAreas: string[];
            recommendations: string[];
            questionAlignment: string;
            expectedAreaCount: number;
            coveredAreaCount: number;
            timestamp: string;
          }
        }
      />
    );
  }

  // Check if this is a save_critique tool result
  if (message.name === "save_critique") {
    return (
      <SaveCritiqueResult
        result={
          parsedContent as {
            category: string;
            findings: Array<{
              issue: string;
              severity: "critical" | "high" | "medium" | "low";
              suggestion: string;
              location: string;
            }>;
            totalIssues: number;
            severityBreakdown: {
              critical: number;
              high: number;
              medium: number;
              low: number;
            };
            metadata?: Record<string, unknown>;
            timestamp: string;
          }
        }
      />
    );
  }

  // Check if this is a task tool result (subagent delegation)
  if (message.name === "task") {
    // Extract subagent type from parsed content
    const taskResult = parsedContent as {
      subagentType?: string;
      content?: string;
      result?: string;
    };
    const subagentType = taskResult.subagentType || "generic-agent";
    const content = taskResult.content || taskResult.result || (typeof parsedContent === "string" ? parsedContent : "");

    return (
      <SubagentTaskResult
        content={content}
        subagentType={subagentType}
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

  if (items.length === 0) {
    return (
      <div className="px-4 py-3 text-muted-foreground text-sm">
        No structured values were returned for this tool call.
      </div>
    );
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
  const hasContent = contentStr.trim().length > 0;
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
                ) : hasContent ? (
                  <code className="block text-sm">{displayedContent}</code>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    This tool call finished without returning text output.
                  </p>
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

  // Check for errors in tool results
  const contentStr = typeof message.content === "string" ? message.content : "";
  const isError =
    message.status === "error" ||
    contentStr.toLowerCase().includes("error:") ||
    contentStr.toLowerCase().startsWith("error ");

  if (isError && message.name) {
    return (
      <ErrorResult
        toolName={message.name}
        errorMessage={contentStr}
      />
    );
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

  // Default content display - COMMENTED OUT to force custom components for all tools
  // return (
  //   <DefaultContentRenderer
  //     isJsonContent={isJsonContent}
  //     message={message}
  //     parsedContent={parsedContent}
  //   />
  // );

  // Return null if no custom renderer found - this forces all tools to have custom UI
  return null;
}
