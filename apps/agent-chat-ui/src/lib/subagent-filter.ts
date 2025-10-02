import type { Message } from "@langchain/langgraph-sdk";
import { DO_NOT_RENDER_ID_PREFIX } from "./ensure-tool-responses";

// Patterns that identify subagent responses
const SUBAGENT_RESPONSE_PATTERNS = [
  // Research agent response pattern
  /^RESEARCH FINDINGS:/m,
  // Critique agent response pattern
  /^CRITIQUE OF REPORT:/m,
  // Code assistant subagent patterns
  /^CODE ANALYSIS:/m,
  /^BUG FIX ANALYSIS:/m,
  /^CODE GENERATION:/m,
];

// Subagent names that might appear in message metadata or content
const SUBAGENT_NAMES = [
  "research-agent",
  "critique-agent",
  "code-analyzer",
  "bug-fixer",
  "code-generator",
];

/**
 * Checks if a message is a subagent response that should be hidden from the UI
 * @param message The message to check
 * @returns true if the message should be hidden, false otherwise
 */
export function isSubagentResponse(message: Message): boolean {
  // First check if it's already marked as do-not-render
  if (message.id?.startsWith(DO_NOT_RENDER_ID_PREFIX)) {
    return true;
  }

  // Don't filter planner-agent tool messages - they're displayed in the UI
  if (message.type === "tool") {
    const toolMessage = message as any;
    if (
      toolMessage.name === "topic_analysis" ||
      toolMessage.name === "scope_estimation" ||
      toolMessage.name === "plan_optimization"
    ) {
      return false;
    }
  }

  // Only check AI messages for subagent content
  if (message.type !== "ai") {
    return false;
  }

  const contentString = getMessageContentString(message.content);

  // Check if content matches subagent response patterns
  for (const pattern of SUBAGENT_RESPONSE_PATTERNS) {
    if (pattern.test(contentString)) {
      return true;
    }
  }

  // Check if content mentions subagent names in a way that indicates it's a response
  for (const name of SUBAGENT_NAMES) {
    // Look for patterns like "research-agent response:" or similar
    if (
      new RegExp(`^${name.replace("-", "[ -]")}[:\\s].*`, "im").test(
        contentString
      )
    ) {
      return true;
    }
  }

  // Check for specific structured formats that subagents use
  // Research agent format
  if (/RESEARCH FINDINGS:[\s\S]*Key Information:\n•/.test(contentString)) {
    return true;
  }

  // Critique agent format
  if (/CRITIQUE OF REPORT:[\s\S]*Overall Assessment:\n•/.test(contentString)) {
    return true;
  }

  return false;
}

/**
 * Extracts the string content from a message
 */
function getMessageContentString(content: Message["content"]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join(" ");
  }
  return "";
}

/**
 * Filters out subagent responses from an array of messages
 * @param messages The messages to filter
 * @returns Filtered messages with subagent responses removed
 */
export function filterSubagentResponses(messages: Message[]): Message[] {
  return messages.filter((message) => !isSubagentResponse(message));
}
