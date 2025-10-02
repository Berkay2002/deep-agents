import type { Message, ToolMessage } from "@langchain/langgraph-sdk";

// Define types for tool calls and their arguments
type ToolCall = {
  id?: string;
  name: string;
  args: Record<string, unknown>;
};

type ResearchAgentTaskArgs = {
  subagentType: string;
  description: string;
};

// Define types for search result content
type TavilyResultItem = {
  url: string;
  title: string;
  content: string;
  score?: number;
  rawContent?: string | null;
};

type ExaResultItem = {
  url: string;
  title?: string | null;
  summary?: string | null;
  snippet?: string | null;
  text?: string | null;
  fullText?: string | null;
  author?: string | null;
  publishedDate?: string | null;
  highlights?: Array<{
    snippet?: string | null;
    source?: string | null;
  }>;
};

export type TavilySearchResultData = {
  query: string;
  results: Array<{
    url: string;
    title: string;
    content: string;
    score?: number;
    rawContent?: string | null;
  }>;
  responseTime?: number;
  searchType: "tavily";
};

export type ExaSearchResultData = {
  query: string;
  results: Array<{
    url: string;
    title?: string | null;
    summary?: string | null;
    snippet?: string | null;
    fullText?: string | null;
    author?: string | null;
    publishedDate?: string | null;
    highlights?: Array<{
      snippet?: string | null;
      source?: string | null;
    }>;
  }>;
  responseTime?: number;
  searchType: "exa";
};

export type SearchResultData = TavilySearchResultData | ExaSearchResultData;

export type ResearchAgentStatus = "pending" | "in_progress" | "completed";

export type ResearchAgentGroup = {
  taskDescription: string;
  taskToolCallId: string;
  searchResults: SearchResultData[];
  findings?: string;
  status: ResearchAgentStatus;
  startIndex: number;
  endIndex: number;
  statusUpdates?: string[];
};

/**
 * Checks if a tool call is a research agent task invocation
 */
function isResearchAgentTask(toolCall: ToolCall): boolean {
  if (!toolCall || toolCall.name !== "task") {
    return false;
  }
  const args = toolCall.args as ResearchAgentTaskArgs;
  return args?.subagentType === "research-agent" && !!args?.description;
}

/**
 * Extracts Tavily search result data from a tool message content
 */
function extractTavilySearchResults(
  content: unknown
): TavilySearchResultData | null {
  try {
    let parsedContent: Record<string, unknown>;

    if (typeof content === "string") {
      parsedContent = JSON.parse(content) as Record<string, unknown>;
    } else if (typeof content === "object" && content !== null) {
      parsedContent = content as Record<string, unknown>;
    } else {
      return null;
    }

    // Tavily results have 'content' field
    if (
      "results" in parsedContent &&
      Array.isArray(parsedContent.results) &&
      parsedContent.results.length > 0
    ) {
      const firstResult = parsedContent.results[0] as Record<string, unknown>;
      if (firstResult?.url && firstResult?.content !== undefined) {
        return {
          query: (parsedContent.query as string) || "",
          results: (parsedContent.results as TavilyResultItem[]).map((r) => ({
            url: r.url,
            title: r.title,
            content: r.content,
            score: r.score,
            rawContent: r.rawContent,
          })),
          responseTime: parsedContent.response_time as number,
          searchType: "tavily",
        };
      }
    }
  } catch {
    // Not a valid Tavily search result
  }
  return null;
}

/**
 * Extracts Exa search result data from a tool message content
 */
function extractExaSearchResults(content: unknown): ExaSearchResultData | null {
  try {
    let parsedContent: Record<string, unknown>;

    if (typeof content === "string") {
      parsedContent = JSON.parse(content) as Record<string, unknown>;
    } else if (typeof content === "object" && content !== null) {
      parsedContent = content as Record<string, unknown>;
    } else {
      return null;
    }

    // Exa results have different structure (no 'content' field, but may have 'text', 'summary', 'snippet')
    if (
      "results" in parsedContent &&
      Array.isArray(parsedContent.results) &&
      parsedContent.results.length > 0
    ) {
      const firstResult = parsedContent.results[0] as Record<string, unknown>;
      if (
        firstResult?.url &&
        // Check for Exa-specific fields (not 'content' like Tavily)
        (firstResult?.text !== undefined ||
          firstResult?.summary !== undefined ||
          firstResult?.snippet !== undefined ||
          firstResult?.highlights !== undefined)
      ) {
        return {
          query: (parsedContent.query as string) || "",
          results: (parsedContent.results as ExaResultItem[]).map((r) => ({
            url: r.url,
            title: r.title,
            summary: r.summary,
            snippet: r.snippet,
            fullText: r.text || r.fullText,
            author: r.author,
            publishedDate: r.publishedDate,
            highlights: r.highlights,
          })),
          responseTime: parsedContent.response_time as number,
          searchType: "exa",
        };
      }
    }
  } catch {
    // Not a valid Exa search result
  }
  return null;
}

/**
 * Extracts search result data from a tool message content (tries both Tavily and Exa)
 */
function extractSearchResults(content: unknown): SearchResultData | null {
  // Try Tavily first (most common)
  const tavilyResults = extractTavilySearchResults(content);
  if (tavilyResults) {
    return tavilyResults;
  }

  // Try Exa
  const exaResults = extractExaSearchResults(content);
  if (exaResults) {
    return exaResults;
  }

  return null;
}

/**
 * Extracts research findings from a tool message
 */
function extractResearchFindings(message: ToolMessage): string | null {
  if (typeof message.content !== "string") {
    return null;
  }

  // Return the content if it exists and is non-empty
  return message.content.trim().length > 0 ? message.content : null;
}

/**
 * Groups research agent related messages together
 * Returns an array of research agent groups found in the messages
 */

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This function requires complex logic to group messages correctly
export function groupResearchAgentMessages(
  messages: Message[]
): ResearchAgentGroup[] {
  const groups: ResearchAgentGroup[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // Check if this is an AI message with research agent task tool calls
    if (
      message.type === "ai" &&
      "tool_calls" in message &&
      message.tool_calls
    ) {
      // Find ALL research tasks in this message (there might be multiple)
      const researchTasks = message.tool_calls.filter(isResearchAgentTask);

      // Process each research task separately
      for (const researchTask of researchTasks) {
        const taskDescription =
          (researchTask.args as ResearchAgentTaskArgs).description || "";
        const taskToolCallId = researchTask.id || "";

        // Now collect all subsequent messages related to this research task
        const searchResults: SearchResultData[] = [];
        let findings: string | undefined;
        let endIndex = i;
        const statusUpdates: string[] = [];

        // Determine initial status
        let status: ResearchAgentStatus = "pending";
        let hasToolResult = false;

        // Debug logging
        if (process.env.NODE_ENV === "development") {
          // Development debug information
        }

        // Look ahead for search results and findings
        for (let j = i + 1; j < messages.length; j++) {
          const nextMessage = messages[j];

          // Check for AI messages that might contain status updates
          if (nextMessage.type === "ai" && !("tool_calls" in nextMessage)) {
            // This is an AI message without tool calls, likely a status update
            const content = Array.isArray(nextMessage.content)
              ? nextMessage.content
                  .map((c) => (c.type === "text" ? c.text : ""))
                  .join("")
              : nextMessage.content;

            if (
              content &&
              typeof content === "string" &&
              content.trim().length > 0
            ) {
              statusUpdates.push(content);
              endIndex = j;
              // If we have status updates, agent is in progress
              if (status === "pending") {
                status = "in_progress";
              }
              continue;
            }
          }

          // Check for search results
          if (nextMessage.type === "tool") {
            const searchData = extractSearchResults(nextMessage.content);
            if (searchData) {
              searchResults.push(searchData);
              endIndex = j;
              // If we have search results, agent is in progress
              if (status === "pending") {
                status = "in_progress";
              }
              continue;
            }

            // Debug: log all tool messages to see what we're getting
            if (
              process.env.NODE_ENV === "development" &&
              "tool_call_id" in nextMessage
            ) {
              // Development debug information
            }

            // Check for research findings (final response from research agent)
            if (
              "tool_call_id" in nextMessage &&
              nextMessage.tool_call_id === taskToolCallId
            ) {
              hasToolResult = true;
              const researchFindings = extractResearchFindings(
                nextMessage as ToolMessage
              );

              // Debug: log when we find a matching tool result
              if (process.env.NODE_ENV === "development") {
                // Development debug information
              }

              // If we have research findings (tool result with matching ID), mark as completed
              if (researchFindings) {
                findings = researchFindings;
                status = "completed";
                endIndex = j;
                break; // Research agent task is complete
              }
            }
          }

          // If we hit another AI message with tool calls, this research task might be complete
          if (
            nextMessage.type === "ai" &&
            "tool_calls" in nextMessage &&
            nextMessage.tool_calls &&
            nextMessage.tool_calls.length > 0
          ) {
            // Check if it's a different research task or unrelated tool call
            const hasAnotherResearchTask =
              nextMessage.tool_calls.some(isResearchAgentTask);
            if (hasAnotherResearchTask) {
              // Found the start of a new research task, stop here
              break;
            }
          }
        }

        // If we have search results but no final result, agent is still in progress
        if (searchResults.length > 0 && !hasToolResult) {
          status = "in_progress";
        }

        // Debug: log final status
        if (process.env.NODE_ENV === "development") {
          // Development debug information
        }

        groups.push({
          taskDescription,
          taskToolCallId,
          searchResults,
          findings,
          status,
          startIndex: i,
          endIndex,
          statusUpdates,
        });
      }
    }
  }

  return groups;
}

/**
 * Checks if a message index is part of a research agent group
 */
export function isMessageInResearchGroup(
  messageIndex: number,
  groups: ResearchAgentGroup[]
): boolean {
  return groups.some(
    (group) =>
      messageIndex >= group.startIndex && messageIndex <= group.endIndex
  );
}
