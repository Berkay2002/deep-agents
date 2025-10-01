import { Message, ToolMessage } from "@langchain/langgraph-sdk";

export interface TavilySearchResultData {
  query: string;
  results: Array<{
    url: string;
    title: string;
    content: string;
    score?: number;
    raw_content?: string | null;
  }>;
  responseTime?: number;
  searchType: "tavily";
}

export interface ExaSearchResultData {
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
}

export type SearchResultData = TavilySearchResultData | ExaSearchResultData;

export type ResearchAgentStatus = "pending" | "in_progress" | "completed";

export interface ResearchAgentGroup {
  taskDescription: string;
  taskToolCallId: string;
  searchResults: SearchResultData[];
  findings?: string;
  status: ResearchAgentStatus;
  startIndex: number;
  endIndex: number;
  statusUpdates?: string[];
}

/**
 * Checks if a tool call is a research agent task invocation
 */
function isResearchAgentTask(toolCall: any): boolean {
  if (!toolCall || toolCall.name !== "task") return false;
  const args = toolCall.args as Record<string, any>;
  return args?.subagent_type === "research-agent" && !!args?.description;
}

/**
 * Extracts Tavily search result data from a tool message content
 */
function extractTavilySearchResults(content: any): TavilySearchResultData | null {
  try {
    let parsedContent: any;

    if (typeof content === "string") {
      parsedContent = JSON.parse(content);
    } else {
      parsedContent = content;
    }

    // Tavily results have 'content' field
    if (
      typeof parsedContent === "object" &&
      "results" in parsedContent &&
      Array.isArray(parsedContent.results) &&
      parsedContent.results.length > 0 &&
      parsedContent.results[0].url &&
      parsedContent.results[0].content !== undefined
    ) {
      return {
        query: parsedContent.query || "",
        results: parsedContent.results,
        responseTime: parsedContent.response_time,
        searchType: "tavily",
      };
    }
  } catch {
    // Not a valid Tavily search result
  }
  return null;
}

/**
 * Extracts Exa search result data from a tool message content
 */
function extractExaSearchResults(content: any): ExaSearchResultData | null {
  try {
    let parsedContent: any;

    if (typeof content === "string") {
      parsedContent = JSON.parse(content);
    } else {
      parsedContent = content;
    }

    // Exa results have different structure (no 'content' field, but may have 'text', 'summary', 'snippet')
    if (
      typeof parsedContent === "object" &&
      "results" in parsedContent &&
      Array.isArray(parsedContent.results) &&
      parsedContent.results.length > 0 &&
      parsedContent.results[0].url &&
      // Check for Exa-specific fields (not 'content' like Tavily)
      (parsedContent.results[0].text !== undefined ||
       parsedContent.results[0].summary !== undefined ||
       parsedContent.results[0].snippet !== undefined ||
       parsedContent.results[0].highlights !== undefined)
    ) {
      return {
        query: parsedContent.query || "",
        results: parsedContent.results.map((r: any) => ({
          url: r.url,
          title: r.title,
          summary: r.summary,
          snippet: r.snippet,
          fullText: r.text || r.fullText,
          author: r.author,
          publishedDate: r.publishedDate,
          highlights: r.highlights,
        })),
        responseTime: parsedContent.response_time,
        searchType: "exa",
      };
    }
  } catch {
    // Not a valid Exa search result
  }
  return null;
}

/**
 * Extracts search result data from a tool message content (tries both Tavily and Exa)
 */
function extractSearchResults(content: any): SearchResultData | null {
  // Try Tavily first (most common)
  const tavilyResults = extractTavilySearchResults(content);
  if (tavilyResults) return tavilyResults;

  // Try Exa
  const exaResults = extractExaSearchResults(content);
  if (exaResults) return exaResults;

  return null;
}

/**
 * Extracts research findings from a tool message
 */
function extractResearchFindings(message: ToolMessage): string | null {
  if (typeof message.content !== "string") return null;

  // Return the content if it exists and is non-empty
  return message.content.trim().length > 0 ? message.content : null;
}

/**
 * Groups research agent related messages together
 * Returns an array of research agent groups found in the messages
 */
export function groupResearchAgentMessages(messages: Message[]): ResearchAgentGroup[] {
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
        const taskDescription = (researchTask.args as any).description || "";
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
          console.log(`[Research Agent] Processing task: ${taskDescription.substring(0, 50)}...`);
          console.log(`[Research Agent] Looking for tool_call_id: ${taskToolCallId}`);
        }

        // Look ahead for search results and findings
        for (let j = i + 1; j < messages.length; j++) {
          const nextMessage = messages[j];

          // Check for AI messages that might contain status updates
          if (nextMessage.type === "ai" && !("tool_calls" in nextMessage)) {
            // This is an AI message without tool calls, likely a status update
            const content = Array.isArray(nextMessage.content)
              ? nextMessage.content.map(c => c.type === "text" ? c.text : "").join("")
              : nextMessage.content;
            
            if (content && typeof content === "string" && content.trim().length > 0) {
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
            if (process.env.NODE_ENV === "development" && "tool_call_id" in nextMessage) {
              console.log(`[Research Agent] Found tool message with tool_call_id: ${nextMessage.tool_call_id}`);
              console.log(`[Research Agent] Matches expected? ${nextMessage.tool_call_id === taskToolCallId}`);
              console.log(`[Research Agent] Content type: ${typeof nextMessage.content}`);
              console.log(`[Research Agent] Content preview: ${typeof nextMessage.content === "string" ? nextMessage.content.substring(0, 100) : "non-string"}`);
            }

            // Check for research findings (final response from research agent)
            if (
              "tool_call_id" in nextMessage &&
              nextMessage.tool_call_id === taskToolCallId
            ) {
              hasToolResult = true;
              const researchFindings = extractResearchFindings(nextMessage as ToolMessage);

              // Debug: log when we find a matching tool result
              if (process.env.NODE_ENV === "development") {
                console.log(`[Research Agent] Found result for task ${taskToolCallId.substring(0, 8)}:`, {
                  hasFindings: !!researchFindings,
                  contentLength: typeof nextMessage.content === "string" ? nextMessage.content.length : 0,
                });
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
            const hasAnotherResearchTask = nextMessage.tool_calls.some(isResearchAgentTask);
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
          console.log(`[Research Agent] Final status for task: ${status}`);
          console.log(`[Research Agent] Has findings: ${!!findings}`);
          console.log(`[Research Agent] Search results count: ${searchResults.length}`);
          console.log("---");
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
    (group) => messageIndex >= group.startIndex && messageIndex <= group.endIndex
  );
}
