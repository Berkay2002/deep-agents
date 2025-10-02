/** biome-ignore-all lint/correctness/noUnusedImports: <> */
"use client";

import type { Message } from "@langchain/langgraph-sdk";
import { formatDistanceToNow } from "date-fns";
import { ReactNode } from "react";

import {
  type CritiqueAgentGroup,
  groupCritiqueAgentMessages,
} from "@/lib/critique-agent-grouper";
import {
  groupPlannerAgentMessages,
  type PlannerAgentGroup,
} from "@/lib/planner-agent-grouper";
import {
  groupResearchAgentMessages,
  type ResearchAgentGroup,
} from "@/lib/research-agent-grouper";

import { CritiqueAgentContainer } from "./messages/critique-agent-container";
import { ExaSearchResults } from "./messages/exa-search-results";
import {
  type Collaborator,
  FileUpdateNotification,
} from "./messages/file-update-notification";
import { PlanOptimizationResult } from "./messages/plan-optimization-result";
import { PlannerAgentContainer } from "./messages/planner-agent-container";
import { ResearchAgentContainer } from "./messages/research-agent-container";
import { ScopeEstimationResult } from "./messages/scope-estimation-result";
import { TavilySearchResults } from "./messages/tavily-search-results";
import { ToolCalls, ToolResult } from "./messages/tool-calls";
import { TopicAnalysisResult } from "./messages/topic-analysis-result";
import { WriteFileDiff } from "./messages/write-file-diff";
import {
  createTimelineActivity,
  extractFileNameFromArgs,
  getActivityTypeFromTool,
  type TimelineActivity,
  TimelineContainer,
} from "./timeline-container";
import { TodoList } from "./todo-list";

type Todo = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm?: string;
};

type TimelineAdapterProps = {
  messages: Message[];
  className?: string;
  isLast?: boolean;
};

type ToolCallData = {
  index: number;
  toolIndex: number;
  toolName: string;
  args: Record<string, unknown>;
  result?: { error?: string; success?: boolean };
};

// Helper function to process todo tool calls
function processTodoToolCall(data: ToolCallData): TimelineActivity | null {
  const { index, toolIndex, args } = data;
  if (args?.todos && Array.isArray(args.todos)) {
    return createTimelineActivity(
      `todo-${index}-${toolIndex}`,
      "todo",
      <TodoList todos={args.todos as Todo[]} />,
      {
        title: "Task Progress",
        status: "completed",
      }
    );
  }
  return null;
}

// Helper function to process file edit tool calls
function processFileEditToolCall(data: ToolCallData): TimelineActivity | null {
  const { index, toolIndex, toolName, args, result } = data;
  if (
    ["Write", "Edit", "MultiEdit", "write_file", "edit_file"].includes(toolName)
  ) {
    const fileName = extractFileNameFromArgs(args);
    return createTimelineActivity(
      `file-${index}-${toolIndex}`,
      getActivityTypeFromTool(toolName, args),
      <WriteFileDiff
        args={args}
        error={result?.error}
        success={result?.success}
        toolName={toolName}
      />,
      {
        title: `${toolName === "Write" || toolName === "write_file" ? "Created" : "Modified"}: ${fileName}`,
        status: result?.error ? "error" : "completed",
      }
    );
  }
  return null;
}

// Helper function to process file update notification tool calls
function processFileUpdateNotificationToolCall(
  data: ToolCallData
): TimelineActivity | null {
  const { index, toolIndex, toolName, args, result } = data;
  if (
    toolName === "file_update_notification" ||
    toolName === "collaborative_file_update"
  ) {
    const fileName = (args.file_name ||
      args.fileName ||
      "Unknown file") as string;
    return createTimelineActivity(
      `file-update-${index}-${toolIndex}`,
      "file-update",
      <FileUpdateNotification
        branch={args.branch as string}
        changeType={
          (args.change_type || args.changeType || "modified") as
            | "created"
            | "modified"
            | "deleted"
        }
        collaborators={(args.collaborators || []) as Collaborator[]}
        editorName={args.editor_name as string}
        error={result?.error}
        fileName={fileName}
        isRealTime={(args.is_real_time || args.isRealTime) as boolean}
        newContent={args.new_content as string}
        oldContent={args.old_content as string}
        success={result?.success}
        timestamp={args.timestamp as string}
      />,
      {
        title: `File Update: ${fileName}`,
        status: result?.error ? "error" : "completed",
      }
    );
  }
  return null;
}

// Helper function to process a single tool call
function processToolCall(data: ToolCallData): TimelineActivity | null {
  const { toolName } = data;

  if (toolName === "write_todos" || toolName === "TodoWrite") {
    return processTodoToolCall(data);
  }

  if (
    ["Write", "Edit", "MultiEdit", "write_file", "edit_file"].includes(toolName)
  ) {
    return processFileEditToolCall(data);
  }

  if (
    toolName === "file_update_notification" ||
    toolName === "collaborative_file_update"
  ) {
    return processFileUpdateNotificationToolCall(data);
  }

  return null;
}

// Helper function to process AI tool calls
function processAiToolCalls(
  message: Message,
  index: number,
  resultsMap: Map<string, { error?: string; success?: boolean }>
): TimelineActivity[] {
  const activities: TimelineActivity[] = [];

  if (message.type === "ai" && message.tool_calls) {
    for (const [toolIndex, toolCall] of message.tool_calls.entries()) {
      const args = toolCall.args as Record<string, unknown>;
      const result = toolCall.id ? resultsMap.get(toolCall.id) : undefined;

      const toolCallData: ToolCallData = {
        index,
        toolIndex,
        toolName: toolCall.name || "",
        args,
        result,
      };

      const activity = processToolCall(toolCallData);
      if (activity) {
        activities.push(activity);
      }
    }
  }

  return activities;
}

// Helper function to process tavily search results
function processTavilySearchResults(
  message: Message,
  index: number
): TimelineActivity | null {
  try {
    const parsedContent = JSON.parse(message.content as string);
    if (parsedContent?.results && Array.isArray(parsedContent.results)) {
      return createTimelineActivity(
        `search-${index}`,
        "search-result",
        <TavilySearchResults
          query={parsedContent.query || ""}
          responseTime={parsedContent.response_time}
          results={parsedContent.results}
        />,
        {
          title: `Tavily Search: ${parsedContent.query || "Unknown query"}`,
          status: "completed",
        }
      );
    }
  } catch {
    // Skip if we can't parse the search results
  }
  return null;
}

// Helper function to process exa search results
function processExaSearchResults(
  message: Message,
  index: number
): TimelineActivity | null {
  try {
    const parsedContent = JSON.parse(message.content as string);
    if (parsedContent?.results && Array.isArray(parsedContent.results)) {
      return createTimelineActivity(
        `search-${index}`,
        "search-result",
        <ExaSearchResults
          query={parsedContent.query || ""}
          responseTime={parsedContent.response_time}
          results={parsedContent.results}
        />,
        {
          title: `Exa Search: ${parsedContent.query || "Unknown query"}`,
          status: "completed",
        }
      );
    }
  } catch {
    // Skip if we can't parse the search results
  }
  return null;
}

// Helper function to process search results
function processSearchResults(
  message: Message,
  toolCall: { name?: string },
  index: number
): TimelineActivity[] {
  const activities: TimelineActivity[] = [];

  if (
    toolCall.name === "tavily_search" ||
    toolCall.name === "internet_search"
  ) {
    const activity = processTavilySearchResults(message, index);
    if (activity) {
      activities.push(activity);
    }
  }

  if (toolCall.name === "exa_search") {
    const activity = processExaSearchResults(message, index);
    if (activity) {
      activities.push(activity);
    }
  }

  return activities;
}

// Helper function to process tool messages
function processToolMessages(
  message: Message,
  index: number,
  messages: Message[]
): TimelineActivity[] {
  const activities: TimelineActivity[] = [];

  if (message.type === "tool") {
    // Find the corresponding tool call
    const toolCall = messages
      .filter((m) => m.type === "ai")
      .flatMap((m) => m.tool_calls || [])
      .find((tc) => tc.id === message.tool_call_id);

    if (toolCall) {
      const searchActivities = processSearchResults(message, toolCall, index);
      activities.push(...searchActivities);
    }
  }

  return activities;
}

// Helper function to process individual messages
function processIndividualMessages(
  messages: Message[],
  processedIndices: Set<number>,
  resultsMap: Map<string, { error?: string; success?: boolean }>
): TimelineActivity[] {
  const activities: TimelineActivity[] = [];

  for (const [index, message] of messages.entries()) {
    if (processedIndices.has(index)) {
      continue;
    }

    // Process AI messages with tool calls
    const aiActivities = processAiToolCalls(message, index, resultsMap);
    activities.push(...aiActivities);

    // Process tool messages
    const toolActivities = processToolMessages(message, index, messages);
    activities.push(...toolActivities);
  }

  return activities;
}

// Helper function to mark processed indices
function markProcessedIndices(
  groups: (ResearchAgentGroup | CritiqueAgentGroup | PlannerAgentGroup)[],
  processedIndices: Set<number>
): void {
  for (const group of groups) {
    for (let i = group.startIndex; i <= group.endIndex; i++) {
      processedIndices.add(i);
    }
  }
}

export function TimelineAdapter({
  messages,
  className,
  isLast = false,
}: TimelineAdapterProps) {
  // Group research, critique, and planner agent messages
  const researchGroups = groupResearchAgentMessages(messages);
  const critiqueGroups = groupCritiqueAgentMessages(messages);
  const plannerGroups = groupPlannerAgentMessages(messages);

  const activities: TimelineActivity[] = [];
  const processedIndices = new Set<number>();

  // Create empty results map for tool calls
  const resultsMap = new Map<string, { error?: string; success?: boolean }>();

  // Process research agent groups
  if (researchGroups.length > 0) {
    const agents = researchGroups.map((group) => ({
      taskDescription: group.taskDescription,
      searchResults: group.searchResults,
      fileOperations: group.fileOperations,
      findings: group.findings,
      status: group.status,
    }));

    activities.push(
      createTimelineActivity(
        "research-agents",
        "research",
        <ResearchAgentContainer agents={agents} />,
        {
          title: "Research Agents",
          status: researchGroups[0].status,
        }
      )
    );

    // Mark all research-related messages as processed
    markProcessedIndices(researchGroups, processedIndices);
  }

  // Process critique agent groups
  if (critiqueGroups.length > 0) {
    const agents = critiqueGroups.map((group) => ({
      taskDescription: group.taskDescription,
      critique: group.critique,
      fileReads: group.fileReads,
      fileOperations: group.fileOperations,
    }));

    activities.push(
      createTimelineActivity(
        "critique-agents",
        "critique",
        <CritiqueAgentContainer agents={agents} />,
        {
          title: "Critique Agents",
        }
      )
    );

    // Mark all critique-related messages as processed
    markProcessedIndices(critiqueGroups, processedIndices);
  }

  // Process planner agent groups
  if (plannerGroups.length > 0) {
    const agents = plannerGroups.map((group) => ({
      taskDescription: group.taskDescription,
      topicAnalysis: group.topicAnalysis,
      scopeEstimation: group.scopeEstimation,
      planOptimization: group.planOptimization,
      fileOperations: group.fileOperations,
      finalPlan: group.finalPlan,
      status: group.status,
    }));

    // Create main planning agent activity
    activities.push(
      createTimelineActivity(
        "planner-agents",
        "planning",
        <PlannerAgentContainer agents={agents} />,
        {
          title: "Planning Agents",
          status: plannerGroups[0].status,
        }
      )
    );

    // Note: Planning tool results (topic_analysis, scope_estimation, plan_optimization)
    // are already displayed inside the PlannerAgentContainer component above.
    // We don't need to create separate mini timeline items for them.

    // Mark all planner-related messages as processed
    markProcessedIndices(plannerGroups, processedIndices);
  }

  // Process individual messages
  const individualActivities = processIndividualMessages(
    messages,
    processedIndices,
    resultsMap
  );
  activities.push(...individualActivities);

  if (activities.length === 0) {
    return null;
  }

  return (
    <TimelineContainer
      activities={activities}
      className={className}
      isLast={isLast}
    />
  );
}
