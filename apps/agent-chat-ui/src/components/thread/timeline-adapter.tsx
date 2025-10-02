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
import { FileUpdateNotification } from "./messages/file-update-notification";
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
  TimelineContainer,
} from "./timeline-container";
import { TodoList } from "./todo-list";

interface TimelineAdapterProps {
  messages: Message[];
  className?: string;
  isLast?: boolean;
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

  const activities: any[] = [];
  const processedIndices = new Set<number>();

  // Create empty results map for tool calls
  const resultsMap = new Map<string, { error?: string; success?: boolean }>();

  // Process research agent groups
  if (researchGroups.length > 0) {
    const agents = researchGroups.map((group) => ({
      taskDescription: group.taskDescription,
      searchResults: group.searchResults,
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
    researchGroups.forEach((group) => {
      for (let i = group.startIndex; i <= group.endIndex; i++) {
        processedIndices.add(i);
      }
    });
  }

  // Process critique agent groups
  if (critiqueGroups.length > 0) {
    const agents = critiqueGroups.map((group) => ({
      taskDescription: group.taskDescription,
      critique: group.critique,
      fileReads: group.fileReads,
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
    critiqueGroups.forEach((group) => {
      for (let i = group.startIndex; i <= group.endIndex; i++) {
        processedIndices.add(i);
      }
    });
  }

  // Process planner agent groups
  if (plannerGroups.length > 0) {
    const agents = plannerGroups.map((group) => ({
      taskDescription: group.taskDescription,
      topicAnalysis: group.topicAnalysis,
      scopeEstimation: group.scopeEstimation,
      planOptimization: group.planOptimization,
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

    // Add sub-activities for individual planning tool calls
    plannerGroups.forEach((group, groupIndex) => {
      // Add topic analysis as a mini timeline item
      if (group.topicAnalysis) {
        activities.push(
          createTimelineActivity(
            `planner-${groupIndex}-topic-analysis`,
            "planning",
            <TopicAnalysisResult result={group.topicAnalysis} />,
            {
              title: "Topic Analysis",
              status: "completed",
              isMini: true,
            }
          )
        );
      }

      // Add scope estimation as a mini timeline item
      if (group.scopeEstimation) {
        activities.push(
          createTimelineActivity(
            `planner-${groupIndex}-scope-estimation`,
            "planning",
            <ScopeEstimationResult result={group.scopeEstimation} />,
            {
              title: "Scope Estimation",
              status: "completed",
              isMini: true,
            }
          )
        );
      }

      // Add plan optimization as a mini timeline item
      if (group.planOptimization) {
        activities.push(
          createTimelineActivity(
            `planner-${groupIndex}-plan-optimization`,
            "planning",
            <PlanOptimizationResult result={group.planOptimization} />,
            {
              title: "Plan Optimization",
              status: "completed",
              isMini: true,
            }
          )
        );
      }
    });

    // Mark all planner-related messages as processed
    plannerGroups.forEach((group) => {
      for (let i = group.startIndex; i <= group.endIndex; i++) {
        processedIndices.add(i);
      }
    });
  }

  // Process individual messages
  messages.forEach((message, index) => {
    if (processedIndices.has(index)) return;

    // Process AI messages with tool calls
    if (message.type === "ai" && message.tool_calls) {
      message.tool_calls.forEach((toolCall, toolIndex) => {
        const args = toolCall.args as any;
        const result = toolCall.id ? resultsMap.get(toolCall.id) : undefined;

        // Handle different tool types
        if (toolCall.name === "write_todos" || toolCall.name === "TodoWrite") {
          if (args?.todos && Array.isArray(args.todos)) {
            activities.push(
              createTimelineActivity(
                `todo-${index}-${toolIndex}`,
                "todo",
                <TodoList todos={args.todos} />,
                {
                  title: "Task Progress",
                  status: "completed",
                }
              )
            );
          }
        } else if (
          ["Write", "Edit", "MultiEdit", "write_file", "edit_file"].includes(
            toolCall.name || ""
          )
        ) {
          const fileName = extractFileNameFromArgs(args);
          activities.push(
            createTimelineActivity(
              `file-${index}-${toolIndex}`,
              getActivityTypeFromTool(toolCall.name || "", args),
              <WriteFileDiff
                args={args}
                error={result?.error}
                success={result?.success}
                toolName={toolCall.name || ""}
              />,
              {
                title: `${toolCall.name === "Write" || toolCall.name === "write_file" ? "Created" : "Modified"}: ${fileName}`,
                status: result?.error ? "error" : "completed",
              }
            )
          );
        } else if (
          toolCall.name === "file_update_notification" ||
          toolCall.name === "collaborative_file_update"
        ) {
          const fileName = args?.file_name || args?.fileName || "Unknown file";
          activities.push(
            createTimelineActivity(
              `file-update-${index}-${toolIndex}`,
              "file-update",
              <FileUpdateNotification
                branch={args?.branch}
                changeType={args?.change_type || args.changeType || "modified"}
                collaborators={args?.collaborators || []}
                editorName={args?.editor_name}
                error={result?.error}
                fileName={fileName}
                isRealTime={args?.is_real_time || args.isRealTime}
                newContent={args?.new_content || args.newContent}
                oldContent={args?.old_content || args.oldContent}
                success={result?.success}
                timestamp={args?.timestamp}
              />,
              {
                title: `File Update: ${fileName}`,
                status: result?.error ? "error" : "completed",
              }
            )
          );
        }
      });
    }

    // Process tool messages
    if (message.type === "tool") {
      // Find the corresponding tool call
      const toolCall = messages
        .filter((m) => m.type === "ai")
        .flatMap((m) => m.tool_calls || [])
        .find((tc) => tc.id === message.tool_call_id);

      if (toolCall) {
        const args = toolCall.args as any;

        // Handle Tavily search results
        if (
          toolCall.name === "tavily_search" ||
          toolCall.name === "internet_search"
        ) {
          try {
            const parsedContent = JSON.parse(message.content as string);
            if (
              parsedContent?.results &&
              Array.isArray(parsedContent.results)
            ) {
              activities.push(
                createTimelineActivity(
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
                )
              );
            }
          } catch {
            // Skip if we can't parse the search results
          }
        }

        // Handle Exa search results
        if (toolCall.name === "exa_search") {
          try {
            const parsedContent = JSON.parse(message.content as string);
            if (
              parsedContent?.results &&
              Array.isArray(parsedContent.results)
            ) {
              activities.push(
                createTimelineActivity(
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
                )
              );
            }
          } catch {
            // Skip if we can't parse the search results
          }
        }
      }
    }
  });

  if (activities.length === 0) return null;

  return (
    <TimelineContainer
      activities={activities}
      className={className}
      isLast={isLast}
    />
  );
}
