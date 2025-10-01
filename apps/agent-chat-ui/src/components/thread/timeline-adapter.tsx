"use client";

import { ReactNode } from "react";
import { Message } from "@langchain/langgraph-sdk";
import { 
  groupResearchAgentMessages, 
  type ResearchAgentGroup 
} from "@/lib/research-agent-grouper";
import { 
  groupCritiqueAgentMessages, 
  type CritiqueAgentGroup 
} from "@/lib/critique-agent-grouper";
import { TimelineContainer, createTimelineActivity, extractFileNameFromArgs, getActivityTypeFromTool } from "./timeline-container";
import { ResearchAgentContainer } from "./messages/research-agent-container";
import { CritiqueAgentContainer } from "./messages/critique-agent-container";
import { TodoList } from "./todo-list";
import { FileUpdateNotification } from "./messages/file-update-notification";
import { WriteFileDiff } from "./messages/write-file-diff";
import { ToolCalls } from "./messages/tool-calls";
import { ToolResult } from "./messages/tool-calls";
import { TavilySearchResults } from "./messages/tavily-search-results";
import { ExaSearchResults } from "./messages/exa-search-results";
import { formatDistanceToNow } from "date-fns";

interface TimelineAdapterProps {
  messages: Message[];
  className?: string;
  isLast?: boolean;
}

export function TimelineAdapter({ messages, className, isLast = false }: TimelineAdapterProps) {
  // Group research and critique agent messages
  const researchGroups = groupResearchAgentMessages(messages);
  const critiqueGroups = groupCritiqueAgentMessages(messages);
  
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
    researchGroups.forEach(group => {
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
    critiqueGroups.forEach(group => {
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
          ["Write", "Edit", "MultiEdit", "write_file", "edit_file"].includes(toolCall.name || "")
        ) {
          const fileName = extractFileNameFromArgs(args);
          activities.push(
            createTimelineActivity(
              `file-${index}-${toolIndex}`,
              getActivityTypeFromTool(toolCall.name || "", args),
              <WriteFileDiff 
                toolName={toolCall.name || ""} 
                args={args} 
                error={result?.error}
                success={result?.success}
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
                fileName={fileName}
                editorName={args?.editor_name}
                timestamp={args?.timestamp}
                oldContent={args?.old_content || args.oldContent}
                newContent={args?.new_content || args.newContent}
                changeType={args?.change_type || args.changeType || "modified"}
                collaborators={args?.collaborators || []}
                branch={args?.branch}
                isRealTime={args?.is_real_time || args.isRealTime || false}
                error={result?.error}
                success={result?.success}
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
        .filter(m => m.type === "ai")
        .flatMap(m => m.tool_calls || [])
        .find(tc => tc.id === message.tool_call_id);

      if (toolCall) {
        const args = toolCall.args as any;
        
        // Handle Tavily search results
        if (
          toolCall.name === "tavily_search" ||
          toolCall.name === "internet_search"
        ) {
          try {
            const parsedContent = JSON.parse(message.content as string);
            if (parsedContent?.results && Array.isArray(parsedContent.results)) {
              activities.push(
                createTimelineActivity(
                  `search-${index}`,
                  "search-result",
                  <TavilySearchResults
                    query={parsedContent.query || ""}
                    results={parsedContent.results}
                    responseTime={parsedContent.response_time}
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
            if (parsedContent?.results && Array.isArray(parsedContent.results)) {
              activities.push(
                createTimelineActivity(
                  `search-${index}`,
                  "search-result",
                  <ExaSearchResults
                    query={parsedContent.query || ""}
                    results={parsedContent.results}
                    responseTime={parsedContent.response_time}
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