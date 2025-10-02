import {
  AIMessage,
  type Message,
  type ToolMessage,
} from "@langchain/langgraph-sdk";

export interface PlanningToolResult {
  toolName: "topic_analysis" | "scope_estimation" | "plan_optimization";
  args: any;
  result: any; // Parsed JSON result
  toolCallId: string;
}

export type PlannerAgentStatus = "pending" | "in_progress" | "completed";

export interface PlannerAgentGroup {
  taskDescription: string;
  taskToolCallId: string;
  topicAnalysis?: any;
  scopeEstimation?: any;
  planOptimization?: any;
  finalPlan?: string;
  status: PlannerAgentStatus;
  startIndex: number;
  endIndex: number;
}

/**
 * Checks if a tool call is a planner agent task invocation
 */
function isPlannerAgentTask(toolCall: any): boolean {
  if (!toolCall || toolCall.name !== "task") return false;
  const args = toolCall.args as Record<string, any>;
  return args?.subagent_type === "planner-agent" && !!args?.description;
}

/**
 * Extracts planning tool result from a tool message content
 */
function extractPlanningToolResult(content: any, toolName: string): any {
  try {
    let parsedContent: any;

    if (typeof content === "string") {
      parsedContent = JSON.parse(content);
    } else {
      parsedContent = content;
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
  if (typeof message.content !== "string") return null;

  // Return the content if it exists and is non-empty
  return message.content.trim().length > 0 ? message.content : null;
}

/**
 * Groups planner agent related messages together
 * Returns an array of planner agent groups found in the messages
 */
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
        const taskDescription = (plannerTask.args as any).description || "";
        const taskToolCallId = plannerTask.id || "";

        // Now collect all subsequent messages related to this planner task
        let topicAnalysis: any;
        let scopeEstimation: any;
        let planOptimization: any;
        let finalPlan: string | undefined;
        let endIndex = i;

        // Determine initial status
        let status: PlannerAgentStatus = "pending";
        let hasToolResult = false;

        // Debug logging
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[Planner Agent] Processing task: ${taskDescription.substring(0, 50)}...`
          );
          console.log(
            `[Planner Agent] Looking for tool_call_id: ${taskToolCallId}`
          );
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
              topicAnalysis = result;
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
              scopeEstimation = result;
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
              planOptimization = result;
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
              console.log(
                `[Planner Agent] Found tool message with tool_call_id: ${toolMsg.tool_call_id}`
              );
              console.log(
                `[Planner Agent] Matches expected? ${toolMsg.tool_call_id === taskToolCallId}`
              );
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
                console.log(
                  `[Planner Agent] Found result for task ${taskToolCallId.substring(0, 8)}:`,
                  {
                    hasPlan: !!planResult,
                    contentLength:
                      typeof toolMsg.content === "string"
                        ? toolMsg.content.length
                        : 0,
                  }
                );
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
          console.log(`[Planner Agent] Final status for task: ${status}`);
          console.log(`[Planner Agent] Has final plan: ${!!finalPlan}`);
          console.log(`[Planner Agent] Has topic analysis: ${!!topicAnalysis}`);
          console.log(
            `[Planner Agent] Has scope estimation: ${!!scopeEstimation}`
          );
          console.log(
            `[Planner Agent] Has plan optimization: ${!!planOptimization}`
          );
          console.log("---");
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
