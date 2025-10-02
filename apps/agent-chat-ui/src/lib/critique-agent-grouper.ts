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

export type CritiqueAgentGroup = {
  taskDescription: string;
  taskToolCallId: string;
  critique?: string;
  fileReads: FileRead[];
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

        // Collect all AI message content between task invocation and completion
        const allAiContent: string[] = [];

        // Look ahead for critique response
        for (let j = i + 1; j < messages.length; j++) {
          const nextMessage = messages[j];

          // Check for file read operations
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
 * Checks if a tool_call_id belongs to a file read operation in a critique agent group
 */
export function isToolCallInCritiqueGroup(
  toolCallId: string,
  groups: CritiqueAgentGroup[]
): boolean {
  return groups.some((group) =>
    group.fileReads.some((fileRead) => fileRead.toolCallId === toolCallId)
  );
}
