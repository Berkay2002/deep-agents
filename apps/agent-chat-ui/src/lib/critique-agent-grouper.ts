import type { Message, ToolMessage } from "@langchain/langgraph-sdk";

// Define types for tool calls and their arguments
type ToolCall = {
  id?: string;
  name: string;
  args: Record<string, unknown>;
};

type CritiqueAgentTaskArgs = {
  subagentType: string;
  description: string;
};

// Define constants for magic numbers
const MIN_CONTENT_LENGTH = 100;
const MIN_CRITIQUE_LENGTH = 200;

export type FileRead = {
  filePath: string;
  content: string;
  toolCallId: string;
};

export type FileOperationData = {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: string;
  error?: string;
};

export type FactCheckResult = {
  claim: string;
  context: string;
  verified: boolean;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  synthesizedAnswer: string | null;
  confidence: "high" | "medium" | "low";
  notes: string;
  timestamp: string;
};

export type StructureEvaluationResult = {
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
};

export type CompletenessAnalysisResult = {
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
};

export type SaveCritiqueResult = {
  category: string;
  findings: Array<{
    issue: string;
    severity: string;
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
  metadata: Record<string, unknown>;
  timestamp: string;
};

export type CritiqueAgentGroup = {
  taskDescription: string;
  taskToolCallId: string;
  critique?: string;
  fileReads: FileRead[];
  fileOperations: FileOperationData[];
  factCheckResults: FactCheckResult[];
  structureEvaluationResults: StructureEvaluationResult[];
  completenessAnalysisResults: CompletenessAnalysisResult[];
  saveCritiqueResults: SaveCritiqueResult[];
  startIndex: number;
  endIndex: number;
};

/**
 * Checks if a tool call is a critique agent task invocation
 */
function isCritiqueAgentTask(toolCall: ToolCall): boolean {
  if (!toolCall || toolCall.name !== "task") {
    return false;
  }
  const args = toolCall.args as CritiqueAgentTaskArgs;
  return args?.subagentType === "critique-agent" && !!args?.description;
}

/**
 * Checks if a tool name is a file operation (Write, Edit, ls)
 * Note: Read operations are handled separately in fileReads
 */
function isWriteEditOrLsOperation(toolName: string): boolean {
  return ["Write", "Edit", "MultiEdit", "ls", "write_file", "edit_file"].includes(toolName);
}

/**
 * Checks if a tool name is a critique tool
 */
function isCritiqueTool(toolName: string): boolean {
  return ["fact_check", "evaluate_structure", "analyze_completeness", "save_critique"].includes(toolName);
}

/**
 * Extracts JSON file paths from tool message content
 */
function extractJsonFilePaths(content: string): string[] {
  const filePaths: string[] = [];
  const regex = /\/research\/critiques\/[^\\s"']+/g;
  let match: RegExpExecArray | null;
  
  // biome-ignore lint: This is the standard way to use regex.exec in a loop
  while ((match = regex.exec(content)) !== null) {
    filePaths.push(match[0]);
  }
  
  return filePaths;
}

/**
 * Extracts critique from a tool message
 */
function extractCritique(message: ToolMessage): string | null {
  if (typeof message.content !== "string") {
    return null;
  }

  // Return the content if it exists and is non-empty
  return message.content.trim().length > 0 ? message.content : null;
}

/**
 * Groups critique agent related messages together
 * Returns an array of critique agent groups found in the messages
 */

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <It's fine>
export function groupCritiqueAgentMessages(
  messages: Message[]
): CritiqueAgentGroup[] {
  const groups: CritiqueAgentGroup[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // Check if this is an AI message with critique agent task tool calls
    if (
      message.type === "ai" &&
      "tool_calls" in message &&
      message.tool_calls
    ) {
      // Find ALL critique tasks in this message (there might be multiple)
      const critiqueTasks = message.tool_calls.filter(isCritiqueAgentTask);

      // Process each critique task separately
      for (const critiqueTask of critiqueTasks) {
        const taskDescription =
          (critiqueTask.args as CritiqueAgentTaskArgs).description || "";
        const taskToolCallId = critiqueTask.id || "";

        // Now collect all subsequent messages related to this critique task
        let critique: string | undefined;
        let endIndex = i;
        const fileReads: FileRead[] = [];
        const fileOperations: FileOperationData[] = [];
        const factCheckResults: FactCheckResult[] = [];
        const structureEvaluationResults: StructureEvaluationResult[] = [];
        const completenessAnalysisResults: CompletenessAnalysisResult[] = [];
        const saveCritiqueResults: SaveCritiqueResult[] = [];

        // Collect all AI message content between task invocation and completion
        const allAiContent: string[] = [];

        // Look ahead for critique response
        for (let j = i + 1; j < messages.length; j++) {
          const nextMessage = messages[j];

          // Check for file operations
          if (nextMessage.type === "tool") {
            const toolMsg = nextMessage as ToolMessage;

            // Check if this is a file read (from any AI message, not just critique task)
            // File reads can come from intermediate AI messages during critique execution
            if (
              toolMsg.name === "Read" ||
              toolMsg.name === "read_file" ||
              toolMsg.name === "ReadFile"
            ) {
              // Find the corresponding tool call in previous AI messages
              for (let k = j - 1; k >= i; k--) {
                const prevMsg = messages[k];
                if (
                  prevMsg.type === "ai" &&
                  "tool_calls" in prevMsg &&
                  prevMsg.tool_calls
                ) {
                  const matchingToolCall = prevMsg.tool_calls.find(
                    (tc: ToolCall) => tc.id === toolMsg.tool_call_id
                  );

                  if (matchingToolCall) {
                    const args = matchingToolCall.args as Record<
                      string,
                      unknown
                    >;
                    const filePath =
                      (args.file_path as string) ||
                      (args.filePath as string) ||
                      "unknown";

                    fileReads.push({
                      filePath,
                      content:
                        typeof toolMsg.content === "string"
                          ? toolMsg.content
                          : "",
                      toolCallId: toolMsg.tool_call_id || "",
                    });

                    endIndex = j;
                    break;
                  }
                }
              }
            }
            // Check for Write/Edit/ls operations
            else if (toolMsg.name && isWriteEditOrLsOperation(toolMsg.name)) {
              // Find the corresponding tool call from earlier messages
              const toolCall = messages
                .slice(0, j)
                .filter((m) => m.type === "ai")
                .flatMap((m) => m.tool_calls || [])
                .find((tc) => tc.id === toolMsg.tool_call_id);

              if (toolCall) {
                fileOperations.push({
                  toolCallId: toolMsg.tool_call_id || "",
                  toolName: toolMsg.name,
                  args: toolCall.args as Record<string, unknown>,
                  result: typeof toolMsg.content === "string" ? toolMsg.content : undefined,
                });
                endIndex = j;
              }
            }
            // Check for critique tool results
            else if (toolMsg.name && isCritiqueTool(toolMsg.name)) {
              // Try to parse JSON from the tool message content
              if (typeof toolMsg.content === "string") {
                try {
                  // Look for JSON file paths in the content
                  const jsonFilePaths = extractJsonFilePaths(toolMsg.content);
                  
                  for (const filePath of jsonFilePaths) {
                    // Try to find the file content in fileReads
                    const fileRead = fileReads.find((fr) => fr.filePath === filePath);
                    if (fileRead) {
                      try {
                        const jsonData = JSON.parse(fileRead.content);
                        
                        // Categorize the result based on file path and tool name
                        if (toolMsg.name === "fact_check" || filePath.includes("/fact_checks/")) {
                          factCheckResults.push(jsonData as FactCheckResult);
                        } else if (toolMsg.name === "evaluate_structure" || filePath.includes("structure_evaluation.json")) {
                          structureEvaluationResults.push(jsonData as StructureEvaluationResult);
                        } else if (toolMsg.name === "analyze_completeness" || filePath.includes("completeness_analysis.json")) {
                          completenessAnalysisResults.push(jsonData as CompletenessAnalysisResult);
                        } else if (toolMsg.name === "save_critique" || filePath.includes("_critique.json")) {
                          saveCritiqueResults.push(jsonData as SaveCritiqueResult);
                        }
                      } catch {
                        // Ignore JSON parsing errors
                      }
                    }
                  }
                } catch {
                  // Ignore content parsing errors
                }
              }
              endIndex = j;
            }
          }

          // Collect AI message content (might contain the actual critique)
          if (nextMessage.type === "ai") {
            let textContent = "";

            if (typeof nextMessage.content === "string") {
              textContent = nextMessage.content;
            } else if (Array.isArray(nextMessage.content)) {
              textContent = nextMessage.content
                .filter(
                  (c): c is { type: "text"; text: string } => c.type === "text"
                )
                .map((c) => c.text)
                .join("\n");
            }

            // Only collect substantial content (not just acknowledgments)
            if (
              textContent.length > MIN_CONTENT_LENGTH &&
              !textContent.startsWith("I have completed")
            ) {
              allAiContent.push(textContent);
              endIndex = j;
            }
          }

          // Check for critique response in tool message (final response from critique agent)
          if (
            nextMessage.type === "tool" &&
            "tool_call_id" in nextMessage &&
            nextMessage.tool_call_id === taskToolCallId
          ) {
            const critiqueResponse = extractCritique(
              nextMessage as ToolMessage
            );
            if (critiqueResponse) {
              // If tool response is short, prefer collected AI content
              if (
                critiqueResponse.length < MIN_CRITIQUE_LENGTH &&
                allAiContent.length > 0
              ) {
                critique = allAiContent.join("\n\n");
              } else {
                critique = critiqueResponse;
              }
              endIndex = j;
            }
            // Use collected AI content if we have it
            if (!critique && allAiContent.length > 0) {
              critique = allAiContent.join("\n\n");
            }
          }

          // If we hit another AI message with tool calls, check if we should stop
          if (
            nextMessage.type === "ai" &&
            "tool_calls" in nextMessage &&
            nextMessage.tool_calls &&
            nextMessage.tool_calls.length > 0
          ) {
            // Check if it's a different critique task
            const hasAnotherCritiqueTask =
              nextMessage.tool_calls.some(isCritiqueAgentTask);
            if (hasAnotherCritiqueTask) {
              // Found the start of a new critique task, stop here
              // But first, use any collected content if we don't have critique yet
              if (!critique && allAiContent.length > 0) {
                critique = allAiContent.join("\n\n");
              }
              break;
            }
          }
        }

        // Final fallback: use collected AI content if we still don't have critique
        if (!critique && allAiContent.length > 0) {
          critique = allAiContent.join("\n\n");
        }

        groups.push({
          taskDescription,
          taskToolCallId,
          critique,
          fileReads,
          fileOperations,
          factCheckResults,
          structureEvaluationResults,
          completenessAnalysisResults,
          saveCritiqueResults,
          startIndex: i,
          endIndex,
        });
      }
    }
  }

  return groups;
}

/**
 * Checks if a message index is part of a critique agent group
 */
export function isMessageInCritiqueGroup(
  messageIndex: number,
  groups: CritiqueAgentGroup[]
): boolean {
  return groups.some(
    (group) =>
      messageIndex >= group.startIndex && messageIndex <= group.endIndex
  );
}

/**
 * Checks if a tool_call_id belongs to a file operation in a critique agent group
 */
export function isToolCallInCritiqueGroup(
  toolCallId: string,
  groups: CritiqueAgentGroup[]
): boolean {
  return groups.some((group) =>
    group.fileReads.some((fileRead) => fileRead.toolCallId === toolCallId) ||
    group.fileOperations.some((op) => op.toolCallId === toolCallId)
  );
}
