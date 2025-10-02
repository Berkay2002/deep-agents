import type { Message, ToolMessage } from "@langchain/langgraph-sdk";

// Define types for tool calls and their arguments
type ToolCall = {
  id?: string;
  name: string;
  args: Record<string, unknown>;
};

type PlannerAgentTaskArgs = {
  subagentType: string;
  description: string;
};

export type PlanningToolResult = {
  toolName: "topic_analysis" | "scope_estimation" | "plan_optimization";
  args: Record<string, unknown>;
  result: Record<string, unknown>; // Parsed JSON result
  toolCallId: string;
};

export type PlannerAgentStatus = "pending" | "in_progress" | "completed";

export type PlannerAgentGroup = {
  taskDescription: string;
  taskToolCallId: string;
  topicAnalysis?: Record<string, unknown>;
  scopeEstimation?: Record<string, unknown>;
  planOptimization?: Record<string, unknown>;
  finalPlan?: string;
  status: PlannerAgentStatus;
  startIndex: number;
  endIndex: number;
};

/**
 * Checks if a tool call is a planner agent task invocation
 */
function isPlannerAgentTask(toolCall: ToolCall): boolean {
  if (!toolCall || toolCall.name !== "task") {
    return false;
  }
  const args = toolCall.args as PlannerAgentTaskArgs;
  return args?.subagentType === "planner-agent" && !!args?.description;
}

/**
 * Extracts planning tool result from a tool message content
 */
function extractPlanningToolResult(
  content: unknown,
  _toolName: string
): unknown {
  try {
    let parsedContent: Record<string, unknown>;

    if (typeof content === "string") {
      parsedContent = JSON.parse(content) as Record<string, unknown>;
    } else if (typeof content === "object" && content !== null) {
      parsedContent = content as Record<string, unknown>;
    } else {
      return content;
    }

    // Return the parsed result
    return parsedContent;
  } catch {
    // Not valid JSON, return raw content
    return content;
  }
}

/**
 * Extracts final plan from a tool message
 */
function extractFinalPlan(message: ToolMessage): string | null {
  if (typeof message.content !== "string") {
    return null;
  }

  // Return the content if it exists and is non-empty
  return message.content.trim().length > 0 ? message.content : null;
}

/**
 * Groups planner agent related messages together
 * Returns an array of planner agent groups found in the messages
 */

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <It's fine>
export function groupPlannerAgentMessages(
  messages: Message[]
): PlannerAgentGroup[] {
  const groups: PlannerAgentGroup[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // Check if this is an AI message with planner agent task tool calls
    if (
      message.type === "ai" &&
      "tool_calls" in message &&
      message.tool_calls
    ) {
      // Find ALL planner tasks in this message (there might be multiple)
      const plannerTasks = message.tool_calls.filter(isPlannerAgentTask);

      // Process each planner task separately
      for (const plannerTask of plannerTasks) {
        const taskDescription =
          (plannerTask.args as PlannerAgentTaskArgs).description || "";
        const taskToolCallId = plannerTask.id || "";

        // Now collect all subsequent messages related to this planner task
        let topicAnalysis: Record<string, unknown> | undefined;
        let scopeEstimation: Record<string, unknown> | undefined;
        let planOptimization: Record<string, unknown> | undefined;
        let finalPlan: string | undefined;
        let endIndex = i;

        // Determine initial status
        let status: PlannerAgentStatus = "pending";
        let hasToolResult = false;

        // Debug logging
        if (process.env.NODE_ENV === "development") {
          // Development debug information
        }

        // Look ahead for planning tool results and final plan
        for (let j = i + 1; j < messages.length; j++) {
          const nextMessage = messages[j];

          // Check for planning tool results
          if (nextMessage.type === "tool") {
            const toolMsg = nextMessage as ToolMessage;

            // Check for topic_analysis result
            if (toolMsg.name === "topic_analysis") {
              const result = extractPlanningToolResult(
                toolMsg.content,
                "topic_analysis"
              );
              if (typeof result === "object" && result !== null) {
                topicAnalysis = result as Record<string, unknown>;
              }
              endIndex = Math.max(endIndex, j); // Ensure we capture the latest index
              if (status === "pending") {
                status = "in_progress";
              }
              continue;
            }

            // Check for scope_estimation result
            if (toolMsg.name === "scope_estimation") {
              const result = extractPlanningToolResult(
                toolMsg.content,
                "scope_estimation"
              );
              if (typeof result === "object" && result !== null) {
                scopeEstimation = result as Record<string, unknown>;
              }
              endIndex = Math.max(endIndex, j); // Ensure we capture the latest index
              if (status === "pending") {
                status = "in_progress";
              }
              continue;
            }

            // Check for plan_optimization result
            if (toolMsg.name === "plan_optimization") {
              const result = extractPlanningToolResult(
                toolMsg.content,
                "plan_optimization"
              );
              if (typeof result === "object" && result !== null) {
                planOptimization = result as Record<string, unknown>;
              }
              endIndex = Math.max(endIndex, j); // Ensure we capture the latest index
              if (status === "pending") {
                status = "in_progress";
              }
              continue;
            }

            // Debug: log all tool messages to see what we're getting
            if (
              process.env.NODE_ENV === "development" &&
              "tool_call_id" in toolMsg
            ) {
              // Development debug information
            }

            // Check for final plan (final response from planner agent)
            if (
              "tool_call_id" in toolMsg &&
              toolMsg.tool_call_id === taskToolCallId
            ) {
              hasToolResult = true;
              const planResult = extractFinalPlan(toolMsg);

              // Debug: log when we find a matching tool result
              if (process.env.NODE_ENV === "development") {
                // Development debug information
              }

              // If we have final plan (tool result with matching ID), mark as completed
              if (planResult) {
                finalPlan = planResult;
                status = "completed";
                endIndex = Math.max(endIndex, j); // Ensure we capture the latest index
                break; // Planner agent task is complete
              }
            }
          }

          // If we hit another AI message with tool calls, this planner task might be complete
          if (
            nextMessage.type === "ai" &&
            "tool_calls" in nextMessage &&
            nextMessage.tool_calls &&
            nextMessage.tool_calls.length > 0
          ) {
            // Check if it's a different planner task or unrelated tool call
            const hasAnotherPlannerTask =
              nextMessage.tool_calls.some(isPlannerAgentTask);
            if (hasAnotherPlannerTask) {
              // Found the start of a new planner task, stop here
              break;
            }
          }
        }

        // If we have planning tool results but no final result, agent is still in progress
        if (
          (topicAnalysis || scopeEstimation || planOptimization) &&
          !hasToolResult
        ) {
          status = "in_progress";
        }

        // Debug: log final status
        if (process.env.NODE_ENV === "development") {
          // Development debug information
        }

        groups.push({
          taskDescription,
          taskToolCallId,
          topicAnalysis,
          scopeEstimation,
          planOptimization,
          finalPlan,
          status,
          startIndex: i,
          endIndex,
        });
      }
    }
  }

  return groups;
}

/**
 * Checks if a message index is part of a planner agent group
 */
export function isMessageInPlannerGroup(
  messageIndex: number,
  groups: PlannerAgentGroup[]
): boolean {
  return groups.some(
    (group) =>
      messageIndex >= group.startIndex && messageIndex <= group.endIndex
  );
}
