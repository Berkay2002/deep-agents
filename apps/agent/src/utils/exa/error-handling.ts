import { RateLimitError, SearchTimeoutError, ToolExecutionError } from "../errors.js";

export function classifyExaError(
  error: Error,
  query: string,
  timeoutMs: number,
  toolName: string
): Error {
  const message = error.message.toLowerCase();

  if (message.includes("timeout") || message.includes("timed out")) {
    return new SearchTimeoutError(query, timeoutMs, { toolName });
  }

  if (message.includes("429") || message.includes("rate limit")) {
    return new RateLimitError("Exa", undefined, { toolName, query });
  }

  return new ToolExecutionError(toolName, error.message, error, { query });
}
